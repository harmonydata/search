"use client";

import { useState } from 'react';
import { Box, Container, Typography, TextField, Button, Stack, Divider, Paper } from '@mui/material';
import LinkPreviewCard from '@/components/LinkPreviewCard';
import TextWithLinkPreviews from '@/components/TextWithLinkPreviews';

export default function LinkPreviewExamplePage() {
  const [url, setUrl] = useState('');
  const [previewUrls, setPreviewUrls] = useState<string[]>([
    'https://www.bbc.co.uk/news',
    'https://github.com',
    'https://twitter.com',
    'https://www.nature.com/articles/s41586-023-06724-y',
    'https://www.discoverynext.org'
  ]);
  
  const [textWithLinks, setTextWithLinks] = useState(
    `Here's a paragraph with some embedded links to various websites.

Check out BBC News at https://www.bbc.co.uk/news for the latest updates.

GitHub is a fantastic platform for developers: https://github.com

If you're interested in scientific research, this Nature article is fascinating: https://www.nature.com/articles/s41586-023-06724-y.

And of course, don't forget to visit https://www.discoverynext.org!`
  );
  
  const handleAddUrl = () => {
    if (url && !previewUrls.includes(url)) {
      setPreviewUrls([url, ...previewUrls]);
      setUrl('');
    }
  };
  
  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Link Preview Component Demo
      </Typography>
      
      <Typography variant="body1" paragraph>
        This component fetches Open Graph metadata from URLs and displays them as rich preview cards.
      </Typography>
      
      <Box sx={{ mb: 4, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
        <TextField
          label="Enter URL to preview"
          variant="outlined"
          fullWidth
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddUrl();
            }
          }}
          placeholder="https://example.com"
          sx={{ mb: 2 }}
        />
        <Button 
          variant="contained" 
          onClick={handleAddUrl}
          sx={{ mt: 1 }}
        >
          Add URL
        </Button>
      </Box>
      
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Standard Preview Cards
      </Typography>
      
      <Stack spacing={3} sx={{ mb: 6 }}>
        {previewUrls.map((previewUrl) => (
          <LinkPreviewCard key={previewUrl} url={previewUrl} />
        ))}
      </Stack>
      
      <Divider sx={{ my: 4 }} />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Compact Preview Cards
      </Typography>
      
      <Stack spacing={2} sx={{ mb: 6 }}>
        {previewUrls.map((previewUrl) => (
          <LinkPreviewCard key={`compact-${previewUrl}`} url={previewUrl} compact />
        ))}
      </Stack>
      
      <Divider sx={{ my: 4 }} />
      
      <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
        Automatic Link Detection in Text
      </Typography>
      
      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid', borderColor: 'grey.200' }}>
        <Typography variant="subtitle1" gutterBottom>
          Input Text:
        </Typography>
        <TextField
          multiline
          rows={10}
          variant="outlined"
          fullWidth
          value={textWithLinks}
          onChange={(e) => setTextWithLinks(e.target.value)}
          placeholder="Enter text with URLs..."
          sx={{ mb: 3 }}
        />
        
        <Typography variant="subtitle1" gutterBottom>
          Rendered Output:
        </Typography>
        <Paper 
          elevation={0} 
          sx={{ 
            p: 3, 
            bgcolor: 'rgba(0,0,0,0.02)', 
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'grey.200'
          }}
        >
          <TextWithLinkPreviews text={textWithLinks} compact />
        </Paper>
      </Paper>
      
      <Divider sx={{ my: 4 }} />
      
      <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 4, textAlign: 'center' }}>
        Note: Standard cards show more information and are suitable for primary content,
        while compact cards are ideal for inline text or space-constrained areas.
      </Typography>
    </Container>
  );
} 