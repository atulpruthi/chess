/**
 * Export Utilities for Chess Games
 * Provides functions to export, share, and download game data
 */

interface GameData {
  pgn: string;
  fen?: string;
  players?: {
    white: string;
    black: string;
  };
  result?: string;
  date?: string;
  event?: string;
  site?: string;
}

/**
 * Download PGN file
 */
export const downloadPGN = (gameData: GameData, filename?: string): void => {
  const { pgn, players, result, date, event, site } = gameData;
  
  // Build enhanced PGN with metadata
  let enhancedPGN = '';
  
  if (event) enhancedPGN += `[Event "${event}"]\n`;
  if (site) enhancedPGN += `[Site "${site}"]\n`;
  if (date) enhancedPGN += `[Date "${date}"]\n`;
  
  if (players) {
    enhancedPGN += `[White "${players.white}"]\n`;
    enhancedPGN += `[Black "${players.black}"]\n`;
  }
  
  if (result) enhancedPGN += `[Result "${result}"]\n`;
  
  enhancedPGN += '\n' + pgn;
  
  // Create blob and download
  const blob = new Blob([enhancedPGN], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename || `chess_game_${Date.now()}.pgn`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Copy PGN to clipboard
 */
export const copyPGNToClipboard = async (gameData: GameData): Promise<boolean> => {
  const { pgn, players, result, date } = gameData;
  
  let enhancedPGN = '';
  
  if (date) enhancedPGN += `[Date "${date}"]\n`;
  if (players) {
    enhancedPGN += `[White "${players.white}"]\n`;
    enhancedPGN += `[Black "${players.black}"]\n`;
  }
  if (result) enhancedPGN += `[Result "${result}"]\n`;
  
  enhancedPGN += '\n' + pgn;
  
  try {
    await navigator.clipboard.writeText(enhancedPGN);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};

/**
 * Generate shareable game URL
 */
export const generateShareURL = (gameId: string, baseUrl?: string): string => {
  const base = baseUrl || window.location.origin;
  return `${base}/game-analysis/${gameId}`;
};

/**
 * Share game on social media or via Web Share API
 */
export const shareGame = async (gameData: GameData & { gameId?: string }): Promise<boolean> => {
  const { gameId, players, result } = gameData;
  
  const title = players 
    ? `Chess Game: ${players.white} vs ${players.black}`
    : 'Chess Game';
  
  const text = result 
    ? `${title} - Result: ${result}`
    : title;
  
  const url = gameId ? generateShareURL(gameId) : window.location.href;
  
  // Try Web Share API first (mobile-friendly)
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return true;
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.error('Error sharing:', error);
      }
      return false;
    }
  }
  
  // Fallback: Copy URL to clipboard
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy URL:', error);
    return false;
  }
};

/**
 * Generate FEN image URL (using external service)
 */
export const generateFENImageURL = (fen: string): string => {
  // Use lichess board export
  return `https://lichess1.org/export/fen.gif?fen=${encodeURIComponent(fen)}&theme=brown&piece=cburnett`;
};

/**
 * Export game as JSON
 */
export const downloadGameJSON = (gameData: any, filename?: string): void => {
  const json = JSON.stringify(gameData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename || `chess_game_${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Print game with annotations
 */
export const printGame = (gameData: GameData & { moves?: any[] }): void => {
  const { pgn, players, result, date, moves } = gameData;
  
  // Create a new window for printing
  const printWindow = window.open('', '_blank');
  
  if (!printWindow) {
    alert('Please allow popups to print the game');
    return;
  }
  
  // Build HTML content
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Chess Game</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 800px;
          margin: 40px auto;
          padding: 20px;
          line-height: 1.6;
        }
        h1 {
          color: #333;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        .metadata {
          background: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .metadata p {
          margin: 5px 0;
        }
        .pgn {
          white-space: pre-wrap;
          background: #fafafa;
          padding: 15px;
          border-left: 3px solid #333;
          font-family: 'Courier New', monospace;
          margin: 20px 0;
        }
        .moves {
          margin: 20px 0;
        }
        .move-pair {
          margin: 5px 0;
        }
        @media print {
          body {
            margin: 20px;
          }
        }
      </style>
    </head>
    <body>
      <h1>Chess Game</h1>
  `;
  
  // Add metadata
  html += '<div class="metadata">';
  if (date) html += `<p><strong>Date:</strong> ${date}</p>`;
  if (players) {
    html += `<p><strong>White:</strong> ${players.white}</p>`;
    html += `<p><strong>Black:</strong> ${players.black}</p>`;
  }
  if (result) html += `<p><strong>Result:</strong> ${result}</p>`;
  html += '</div>';
  
  // Add moves if available
  if (moves && moves.length > 0) {
    html += '<div class="moves"><h2>Moves</h2>';
    for (let i = 0; i < moves.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      
      html += `<div class="move-pair">`;
      html += `<strong>${moveNum}.</strong> ${whiteMove}`;
      if (blackMove) html += ` ${blackMove}`;
      html += `</div>`;
    }
    html += '</div>';
  }
  
  // Add PGN
  html += '<h2>PGN</h2>';
  html += `<div class="pgn">${pgn}</div>`;
  
  html += `
    </body>
    </html>
  `;
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then print
  printWindow.onload = () => {
    printWindow.print();
  };
};

/**
 * Generate Twitter share URL
 */
export const shareOnTwitter = (gameData: GameData & { gameId?: string }): void => {
  const { gameId, players, result } = gameData;
  
  let text = 'Check out this chess game!';
  
  if (players) {
    text = `${players.white} vs ${players.black}`;
    if (result) {
      text += ` - ${result}`;
    }
  }
  
  const url = gameId ? generateShareURL(gameId) : window.location.href;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  
  window.open(twitterUrl, '_blank', 'width=550,height=420');
};

/**
 * Generate Facebook share URL
 */
export const shareOnFacebook = (gameId: string): void => {
  const url = generateShareURL(gameId);
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  
  window.open(facebookUrl, '_blank', 'width=550,height=420');
};

/**
 * Copy game link to clipboard with success notification
 */
export const copyGameLink = async (gameId: string): Promise<boolean> => {
  const url = generateShareURL(gameId);
  
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch (error) {
    console.error('Failed to copy link:', error);
    return false;
  }
};
