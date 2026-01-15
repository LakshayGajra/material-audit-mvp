import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

export default function ContractorList({ contractors }) {
  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Contractors
      </Typography>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Phone</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contractors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center">
                  No contractors found
                </TableCell>
              </TableRow>
            ) : (
              contractors.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.code}</TableCell>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.phone || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}
