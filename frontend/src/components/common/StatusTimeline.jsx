import { Stepper, Step, StepLabel } from '@mui/material';

const STEPS = ['REPORTED', 'APPROVED', 'IN_TRANSIT', 'RECEIVED'];

const STEP_LABELS = {
  REPORTED: 'Reported',
  APPROVED: 'Approved',
  IN_TRANSIT: 'In Transit',
  RECEIVED: 'Received',
};

export default function StatusTimeline({ status }) {
  const isDisputed = status === 'DISPUTED';
  const activeStep = isDisputed ? 0 : STEPS.indexOf(status);

  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel
      sx={{
        '& .MuiStepConnector-line': { minWidth: 20 },
        '& .MuiStepLabel-label': { fontSize: '0.7rem', mt: 0.5 },
        minWidth: 280,
      }}
    >
      {STEPS.map((step, index) => {
        const isError = isDisputed && index === 0;
        return (
          <Step key={step} completed={index < activeStep}>
            <StepLabel
              error={isError}
              sx={{
                '& .MuiStepIcon-root': {
                  fontSize: '1.2rem',
                  ...(isError && { color: 'error.main' }),
                },
              }}
            >
              {isError ? 'Disputed' : STEP_LABELS[step]}
            </StepLabel>
          </Step>
        );
      })}
    </Stepper>
  );
}
