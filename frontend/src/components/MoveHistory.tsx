import { useGameStore } from '../store/gameStore';

export default function MoveHistory() {
  const { moveHistory, capturedPieces } = useGameStore();

  // Format moves into pairs (white, black)
  const movePairs: Array<{ number: number; white: string; black?: string }> = [];
  for (let i = 0; i < moveHistory.length; i += 2) {
    movePairs.push({
      number: Math.floor(i / 2) + 1,
      white: moveHistory[i],
      black: moveHistory[i + 1],
    });
  }

  const pieceSymbols: Record<string, string> = {
    p: '♟',
    n: '♞',
    b: '♝',
    r: '♜',
    q: '♛',
    k: '♚',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Move History</h3>

      {/* Captured Pieces */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">White captured:</span>
          <div className="flex gap-1">
            {capturedPieces.white.map((piece, index) => (
              <span key={index} className="text-xl">
                {pieceSymbols[piece]}
              </span>
            ))}
            {capturedPieces.white.length === 0 && (
              <span className="text-sm text-gray-400">None</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Black captured:</span>
          <div className="flex gap-1">
            {capturedPieces.black.map((piece, index) => (
              <span key={index} className="text-xl">
                {pieceSymbols[piece]}
              </span>
            ))}
            {capturedPieces.black.length === 0 && (
              <span className="text-sm text-gray-400">None</span>
            )}
          </div>
        </div>
      </div>

      {/* Move list */}
      <div className="max-h-96 overflow-y-auto border rounded-lg border-gray-200">
        {movePairs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No moves yet</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 w-12">#</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">White</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Black</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movePairs.map(pair => (
                <tr key={pair.number} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-600">{pair.number}</td>
                  <td className="px-3 py-2 font-mono">{pair.white}</td>
                  <td className="px-3 py-2 font-mono text-gray-700">{pair.black || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
