export default function GameTips() {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">Tips</h4>
      <ul className="text-xs text-gray-600 space-y-1">
        <li>Click a piece to see legal moves</li>
        <li>Drag and drop pieces to move</li>
        <li>Right-click to highlight squares</li>
        <li>All chess rules are enforced</li>
      </ul>
    </div>
  );
}
