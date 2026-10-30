document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const inputText = document.getElementById('inputText');
  const inputStats = document.getElementById('inputStats');
  const summarizeBtn = document.getElementById('summarizeBtn');
  const clearInputBtn = document.getElementById('clearInputBtn');
  const alertBox = document.getElementById('alertBox');
  const outputContainer = document.getElementById('outputContainer');
  const outputStats = document.getElementById('outputStats');
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  // Common stop words to exclude during scoring
  const stopWords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can\'t', 'cannot', 'could',
    'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have',
    'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is',
    'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once',
    'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some',
    'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this',
    'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where',
    'which', 'while', 'who', 'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
  ]);

  // Update Input Statistics
  inputText.addEventListener('input', updateInputMetrics);

  function updateInputMetrics() {
    const text = inputText.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = text.length;
    inputStats.textContent = `${words} words | ${chars} chars`;
  }

  // Clear Input
  clearInputBtn.addEventListener('click', () => {
    inputText.value = '';
    updateInputMetrics();
    resetOutput();
    hideAlert();
  });

  // Summarize Handler
  summarizeBtn.addEventListener('click', () => {
    hideAlert();
    const text = inputText.value.trim();

    if (!text) {
      showAlert('Please enter or paste a paragraph to summarize.', 'error');
      return;
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    if (sentences.length < 2) {
      showAlert('Input text is too short. Please provide at least 2 to 3 sentences.', 'error');
      return;
    }

    const lengthOption = document.querySelector('input[name="summaryLength"]:checked').value;
    const summary = generateExtractiveSummary(sentences, lengthOption);
    
    displaySummary(summary, text);
  });

  // Extractive Summarization Logic (Sentence Scoring)
  function generateExtractiveSummary(sentences, lengthOption) {
    // 1. Calculate word frequencies
    const wordFreq = {};
    sentences.forEach(sentence => {
      const words = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      words.forEach(word => {
        if (word && !stopWords.has(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
    });

    // 2. Score sentences based on word frequencies
    const sentenceScores = sentences.map((sentence, index) => {
      const words = sentence.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/);
      let score = 0;
      words.forEach(word => {
        if (wordFreq[word]) {
          score += wordFreq[word];
        }
      });
      // Normalize score by sentence length to avoid bias toward longer sentences
      const normalizedScore = words.length > 0 ? score / words.length : 0;
      return { index, sentence: sentence.trim(), score: normalizedScore };
    });

    // 3. Determine selection ratio
    let ratio = 0.4; // Default medium
    if (lengthOption === 'short') ratio = 0.2;
    if (lengthOption === 'long') ratio = 0.6;

    const countToSelect = Math.max(1, Math.ceil(sentences.length * ratio));

    // 4. Sort by score descending, pick top sentences
    const topSentences = [...sentenceScores]
      .sort((a, b) => b.score - a.score)
      .slice(0, countToSelect);

    // 5. Reorder selected sentences back into original logical chronological order
    topSentences.sort((a, b) => a.index - b.index);

    return topSentences.map(item => item.sentence).join(' ');
  }

  // Display Result
  function displaySummary(summaryText, originalText) {
    outputContainer.classList.remove('empty-state');
    outputContainer.textContent = summaryText;

    const originalWords = originalText.trim().split(/\s+/).length;
    const summaryWords = summaryText.trim().split(/\s+/).length;
    const reduction = Math.round(((originalWords - summaryWords) / originalWords) * 100);

    outputStats.textContent = `${summaryWords} words (${reduction}% smaller)`;

    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    showAlert('Summary generated successfully!', 'success');
  }

  function resetOutput() {
    outputContainer.classList.add('empty-state');
    outputContainer.innerHTML = '<p>Your generated summary will appear here...</p>';
    outputStats.textContent = '0 words';
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
  }

  // Copy Summary
  copyBtn.addEventListener('click', async () => {
    const textToCopy = outputContainer.textContent;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      showAlert('Summary copied to clipboard!', 'success');
    } catch (err) {
      showAlert('Failed to copy text.', 'error');
    }
  });

  // Download Summary
  downloadBtn.addEventListener('click', () => {
    const text = outputContainer.textContent;
    if (!text) return;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'summary.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Alert Helpers
  function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert-box ${type}`;
    setTimeout(() => {
      hideAlert();
    }, 4000);
  }

  function hideAlert() {
    alertBox.className = 'alert-box hidden';
  }
});