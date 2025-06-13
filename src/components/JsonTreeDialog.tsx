"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import { Close, ContentCopy } from "@mui/icons-material";
import JsonView from "@uiw/react-json-view";

interface JsonTreeDialogProps {
  open: boolean;
  onClose: () => void;
  data: any;
  title?: string;
}

export default function JsonTreeDialog({
  open,
  onClose,
  data,
  title = "Debug Data",
}: JsonTreeDialogProps) {
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          maxHeight: "90vh",
          height: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6" component="div">
          {title}
        </Typography>
        <Box>
          <IconButton
            onClick={handleCopyToClipboard}
            size="small"
            sx={{ mr: 1 }}
            title="Copy JSON to clipboard"
          >
            <ContentCopy fontSize="small" />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <Close fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0, height: "100%" }}>
        {open && (
          <Box
            sx={{
              height: "100%",
              overflow: "auto",
              "& .w-json-view-container": {
                backgroundColor: "#fafafa",
                fontSize: "13px",
                fontFamily:
                  '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
              },
            }}
          >
            <JsonView
              value={data}
              collapsed={2}
              displayObjectSize={true}
              displayDataTypes={true}
              enableClipboard={true}
              style={{
                backgroundColor: "#fafafa",
                padding: "16px",
              }}
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCopyToClipboard} startIcon={<ContentCopy />}>
          Copy JSON
        </Button>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
