import { Stepper, Step, StepLabel } from '@mui/material';

const WORKFLOWS = {
  po: {
    steps: ['DRAFT', 'SUBMITTED', 'APPROVED', 'FULLY_RECEIVED'],
    labels: {
      DRAFT: 'Draft',
      SUBMITTED: 'Submitted',
      APPROVED: 'Approved',
      FULLY_RECEIVED: 'Received',
    },
    errorStates: { CANCELLED: 0 },
    partialStates: { PARTIALLY_RECEIVED: 2 },
  },
  inventoryCheck: {
    steps: ['draft', 'counting', 'review', 'resolved'],
    labels: {
      draft: 'Draft',
      counting: 'Counting',
      review: 'Review',
      resolved: 'Resolved',
    },
    errorStates: {},
    partialStates: {},
  },
  rejection: {
    steps: ['REPORTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED'],
    labels: {
      REPORTED: 'Reported',
      APPROVED: 'Approved',
      IN_TRANSIT: 'In Transit',
      RECEIVED: 'Received',
    },
    errorStates: { DISPUTED: 0 },
    partialStates: {},
  },
};

export default function WorkflowStepper({ type, status, compact = false }) {
  const workflow = WORKFLOWS[type];
  if (!workflow) return null;

  const isError = status in (workflow.errorStates || {});
  const isPartial = status in (workflow.partialStates || {});

  let activeStep;
  if (isError) {
    activeStep = workflow.errorStates[status];
  } else if (isPartial) {
    activeStep = workflow.partialStates[status];
  } else {
    activeStep = workflow.steps.indexOf(status);
  }

  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel={!compact}
      sx={{
        ...(compact && { '& .MuiStepConnector-line': { minWidth: 16 } }),
        '& .MuiStepLabel-label': { fontSize: compact ? '0.65rem' : '0.7rem', mt: 0.5 },
        minWidth: compact ? 200 : 280,
      }}
    >
      {workflow.steps.map((step, index) => {
        const isErrorStep = isError && index === activeStep;
        return (
          <Step key={step} completed={index < activeStep && !isError}>
            <StepLabel
              error={isErrorStep}
              sx={{
                '& .MuiStepIcon-root': {
                  fontSize: compact ? '1rem' : '1.2rem',
                  ...(isErrorStep && { color: 'error.main' }),
                },
              }}
            >
              {isErrorStep
                ? (isError ? status.charAt(0) + status.slice(1).toLowerCase() : workflow.labels[step])
                : (isPartial && index === activeStep
                  ? 'Partial'
                  : workflow.labels[step])}
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
}
