import { useState, useEffect } from 'react';
import {
  getInventoryChecks,
  createInventoryCheck,
  getInventoryCheck,
  getCountingView,
  enterCounts,
  saveCountsDraft,
  resolveInventoryCheck,
  getContractors,
  getErrorMessage,
} from '../../api';

export default function useInventoryChecks(refreshKey) {
  const [view, setView] = useState(0); // 0 = Create/Count, 1 = Review, 2 = History
  const [checks, setChecks] = useState([]);
  const [contractors, setContractors] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Create check state
  const [createDialog, setCreateDialog] = useState(false);
  const [newCheck, setNewCheck] = useState({
    contractor_id: '',
    check_type: 'audit',
    is_blind: true,
    check_date: new Date().toISOString().split('T')[0],
    initiated_by: '',
    notes: '',
  });

  // Counting state
  const [countingCheck, setCountingCheck] = useState(null);
  const [counts, setCounts] = useState({});

  // Review state
  const [reviewCheck, setReviewCheck] = useState(null);
  const [resolutions, setResolutions] = useState({});

  // Detail view
  const [detailDialog, setDetailDialog] = useState(false);
  const [selectedCheck, setSelectedCheck] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    loadContractors();
    loadChecks();
  }, [refreshKey]);

  useEffect(() => {
    loadChecks();
  }, [view, statusFilter, typeFilter]);

  const loadContractors = async () => {
    try {
      const res = await getContractors();
      setContractors(res.data || []);
    } catch (err) {
      console.error('Failed to load contractors:', err);
    }
  };

  const loadChecks = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.check_type = typeFilter;

      // For review tab, only show checks needing review
      if (view === 1) params.status = 'review';

      const res = await getInventoryChecks(params);
      setChecks(res.data || []);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load inventory checks'));
      setChecks([]);
    }
  };

  // =========== CREATE CHECK ===========

  const handleCreateCheck = async () => {
    try {
      setLoading(true);
      const res = await createInventoryCheck({
        contractor_id: parseInt(newCheck.contractor_id),
        check_type: newCheck.check_type,
        is_blind: newCheck.is_blind,
        check_date: newCheck.check_date,
        initiated_by: newCheck.initiated_by || null,
        notes: newCheck.notes || null,
      });
      setSuccess(`Inventory check ${res.data.check_number} created`);
      setCreateDialog(false);
      setNewCheck({
        contractor_id: '',
        check_type: 'audit',
        is_blind: true,
        check_date: new Date().toISOString().split('T')[0],
        initiated_by: '',
        notes: '',
      });
      // Load the check for counting
      await startCounting(res.data.id);
      loadChecks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create inventory check'));
    } finally {
      setLoading(false);
    }
  };

  // =========== COUNTING ===========

  const startCounting = async (checkId) => {
    try {
      const res = await getCountingView(checkId);
      setCountingCheck(res.data);
      // Initialize counts
      const initialCounts = {};
      res.data.lines.forEach((line) => {
        initialCounts[line.id] = line.actual_quantity !== null ? line.actual_quantity : '';
      });
      setCounts(initialCounts);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load check for counting'));
    }
  };

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      const countsData = Object.entries(counts)
        .filter(([_, qty]) => qty !== '' && qty !== null)
        .map(([lineId, qty]) => ({
          line_id: parseInt(lineId),
          actual_quantity: parseFloat(qty),
        }));

      await saveCountsDraft(countingCheck.id, {
        counted_by: newCheck.initiated_by || 'Auditor',
        counts: countsData,
      });
      setSuccess('Counts saved as draft');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save draft'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCounts = async () => {
    try {
      setLoading(true);
      const countsData = Object.entries(counts)
        .filter(([_, qty]) => qty !== '' && qty !== null)
        .map(([lineId, qty]) => ({
          line_id: parseInt(lineId),
          actual_quantity: parseFloat(qty),
        }));

      if (countsData.length === 0) {
        setError('Please enter at least one count');
        return;
      }

      await enterCounts(countingCheck.id, {
        counted_by: newCheck.initiated_by || 'Auditor',
        counts: countsData,
      });
      setSuccess('Counts submitted for review');
      setCountingCheck(null);
      setCounts({});
      loadChecks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to submit counts'));
    } finally {
      setLoading(false);
    }
  };

  // =========== REVIEW ===========

  const startReview = async (checkId) => {
    try {
      const res = await getInventoryCheck(checkId);
      setReviewCheck(res.data);
      // Initialize resolutions
      const initialResolutions = {};
      res.data.lines.forEach((line) => {
        initialResolutions[line.id] = {
          resolution: line.resolution || 'accept',
          notes: line.resolution_notes || '',
        };
      });
      setResolutions(initialResolutions);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load check for review'));
    }
  };

  const handleResolve = async () => {
    try {
      setLoading(true);
      const resolutionsData = Object.entries(resolutions).map(([lineId, data]) => ({
        line_id: parseInt(lineId),
        resolution: data.resolution,
        resolution_notes: data.notes || null,
      }));

      await resolveInventoryCheck(reviewCheck.id, {
        reviewed_by: 'Manager',
        resolutions: resolutionsData,
      });
      setSuccess('Inventory check resolved');
      setReviewCheck(null);
      setResolutions({});
      loadChecks();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resolve check'));
    } finally {
      setLoading(false);
    }
  };

  // =========== DETAIL VIEW ===========

  const viewDetails = async (checkId) => {
    try {
      const res = await getInventoryCheck(checkId);
      setSelectedCheck(res.data);
      setDetailDialog(true);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load check details'));
    }
  };

  const getVarianceColor = (variance) => {
    if (variance === null || variance === undefined) return 'inherit';
    if (Math.abs(variance) < 0.01) return 'inherit';
    return variance < 0 ? 'error.main' : 'success.main';
  };

  return {
    // View state
    view, setView,
    checks, contractors,
    error, setError,
    success, setSuccess,
    loading,

    // Create dialog
    createDialog, setCreateDialog,
    newCheck, setNewCheck,
    handleCreateCheck,

    // Counting
    countingCheck, setCountingCheck,
    counts, setCounts,
    startCounting,
    handleSaveDraft,
    handleSubmitCounts,

    // Review
    reviewCheck, setReviewCheck,
    resolutions, setResolutions,
    startReview,
    handleResolve,

    // Detail
    detailDialog, setDetailDialog,
    selectedCheck,
    viewDetails,

    // Filters
    statusFilter, setStatusFilter,
    typeFilter, setTypeFilter,

    // Helpers
    loadChecks,
    getVarianceColor,
  };
}
