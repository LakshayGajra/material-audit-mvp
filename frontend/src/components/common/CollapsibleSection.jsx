import { useState } from 'react';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

/**
 * Collapsible section for progressive disclosure in forms
 *
 * @param {string} title - Section title
 * @param {string} subtitle - Optional subtitle/description
 * @param {boolean} defaultExpanded - Whether section starts expanded (default: false)
 * @param {ReactNode} children - Section content
 * @param {boolean} showDivider - Show divider above section (default: true)
 * @param {string} expandLabel - Label shown when collapsed (e.g., "Show advanced options")
 */
export default function CollapsibleSection({
  title,
  subtitle,
  defaultExpanded = false,
  children,
  showDivider = true,
  expandLabel,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box sx={{ mt: showDivider ? 2 : 0 }}>
      {showDivider && <Divider sx={{ mb: 2 }} />}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          py: 1,
          px: 1,
          mx: -1,
          borderRadius: 1,
          '&:hover': {
            bgcolor: 'action.hover',
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box>
          <Typography
            variant="subtitle2"
            color={expanded ? 'text.primary' : 'text.secondary'}
            sx={{ fontWeight: 500 }}
          >
            {expanded ? title : (expandLabel || title)}
          </Typography>
          {subtitle && !expanded && (
            <Typography variant="caption" color="text.disabled">
              {subtitle}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          sx={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Box sx={{ pt: 2 }}>{children}</Box>
      </Collapse>
    </Box>
  );
}
