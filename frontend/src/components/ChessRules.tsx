import React from 'react';
import { useNavigate } from 'react-router-dom';

const ChessRules: React.FC = () => {
  const navigate = useNavigate();

  const rules = [
    {
      title: '🎯 Objective',
      content: 'The goal is to checkmate your opponent\'s King. This means the King is in a position to be captured and cannot escape.',
    },
    {
      title: '♙ Piece Movement',
      subsections: [
        {
          piece: 'Pawn',
          icon: '♟',
          rules: [
            'Moves forward one square (two on first move)',
            'Captures diagonally one square',
            'Promotes to any piece (except King) when reaching the opposite end',
            'Can capture en passant under specific conditions',
          ],
        },
        {
          piece: 'Knight',
          icon: '♞',
          rules: [
            'Moves in an L-shape: two squares in one direction, one perpendicular',
            'Can jump over other pieces',
            'Worth about 3 pawns',
          ],
        },
        {
          piece: 'Bishop',
          icon: '♝',
          rules: [
            'Moves diagonally any number of squares',
            'Each bishop stays on one color throughout the game',
            'Worth about 3 pawns',
          ],
        },
        {
          piece: 'Rook',
          icon: '♜',
          rules: [
            'Moves horizontally or vertically any number of squares',
            'Participates in castling',
            'Worth about 5 pawns',
          ],
        },
        {
          piece: 'Queen',
          icon: '♛',
          rules: [
            'Moves like a rook and bishop combined',
            'Most powerful piece on the board',
            'Worth about 9 pawns',
          ],
        },
        {
          piece: 'King',
          icon: '♚',
          rules: [
            'Moves one square in any direction',
            'Cannot move into check',
            'Participates in castling',
            'Infinite value - losing it means losing the game!',
          ],
        },
      ],
    },
    {
      title: '🏰 Special Moves',
      subsections: [
        {
          piece: 'Castling',
          icon: '🏰',
          rules: [
            'The King moves two squares toward a Rook',
            'The Rook moves to the square the King crossed',
            'Neither piece can have moved before',
            'No pieces between King and Rook',
            'King cannot be in check, move through check, or end in check',
            'Can castle kingside (short) or queenside (long)',
          ],
        },
        {
          piece: 'En Passant',
          icon: '⚡',
          rules: [
            'Special pawn capture',
            'Occurs when opponent\'s pawn moves two squares from starting position',
            'Your pawn must be on the 5th rank (for white) or 4th rank (for black)',
            'Can capture the pawn as if it had moved only one square',
            'Must be done immediately on the next move or the right is lost',
          ],
        },
        {
          piece: 'Promotion',
          icon: '👑',
          rules: [
            'When a pawn reaches the opposite end of the board',
            'Must promote to Queen, Rook, Bishop, or Knight',
            'Usually promoted to Queen (most powerful)',
            'Can have multiple Queens on the board',
          ],
        },
      ],
    },
    {
      title: '✅ Game Rules',
      subsections: [
        {
          piece: 'Check',
          icon: '⚠️',
          rules: [
            'When a King is under attack',
            'Must be resolved immediately',
            'Can block with another piece',
            'Can capture the attacking piece',
            'Can move the King to safety',
          ],
        },
        {
          piece: 'Checkmate',
          icon: '♔',
          rules: [
            'King is in check and cannot escape',
            'Game over - checkmate side wins',
            'No legal moves can save the King',
          ],
        },
        {
          piece: 'Stalemate',
          icon: '🤝',
          rules: [
            'Player has no legal moves',
            'King is NOT in check',
            'Results in a draw',
          ],
        },
        {
          piece: 'Draw',
          icon: '=',
          rules: [
            'Stalemate',
            'Insufficient material (e.g., King vs King)',
            'Threefold repetition of position',
            '50-move rule (50 moves without capture or pawn move)',
            'Mutual agreement between players',
          ],
        },
      ],
    },
    {
      title: '⏱️ Time Controls',
      subsections: [
        {
          piece: 'Bullet',
          icon: '⚡',
          rules: ['Less than 3 minutes per player', 'Very fast-paced', 'Tests quick thinking'],
        },
        {
          piece: 'Blitz',
          icon: '🏃',
          rules: ['3-10 minutes per player', 'Balance of speed and strategy', 'Popular format'],
        },
        {
          piece: 'Rapid',
          icon: '🚶',
          rules: ['10-60 minutes per player', 'More time to think', 'Good for learning'],
        },
        {
          piece: 'Classical',
          icon: '🎩',
          rules: ['Over 60 minutes per player', 'Deep strategic play', 'Tournament standard'],
        },
      ],
    },
    {
      title: '🎓 Chess Etiquette',
      content: (
        <ul className="space-y-2 text-white/80">
          <li>• Touch-move rule: If you touch a piece, you must move it (if legal)</li>
          <li>• Offer a handshake before and after the game</li>
          <li>• Don't distract your opponent</li>
          <li>• Resign when the position is clearly lost</li>
          <li>• Analyze the game together after it ends</li>
          <li>• Be gracious in victory and defeat</li>
        </ul>
      ),
    },
  ];

  return (
    <div className="lobby-shell">
      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-20 pt-8">
        {/* Header */}
        <header className="flex flex-col gap-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[30px] font-extrabold">📖 Chess Rules & Reference</div>
              <div className="text-white/60 text-sm mt-2">Complete guide to chess rules and gameplay</div>
            </div>
            <button onClick={() => navigate('/lobby')} className="btn-secondary">
              ← Back
            </button>
          </div>
        </header>

        <div className="space-y-6">
          {rules.map((section, idx) => (
            <div
              key={idx}
              className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-10 py-8 shadow-[0_14px_50px_rgba(0,0,0,0.45)]"
            >
              <h2 className="text-2xl font-bold text-white mb-6">{section.title}</h2>

              {section.content && (
                typeof section.content === 'string' ? (
                  <p className="text-white/80 text-lg">{section.content}</p>
                ) : (
                  section.content
                )
              )}

              {section.subsections && (
                <div className="space-y-6">
                  {section.subsections.map((subsection, subIdx) => (
                    <div key={subIdx} className="bg-white/[0.05] rounded-2xl p-6 border border-white/10">
                      <h3 className="text-xl font-semibold text-white mb-3 flex items-center gap-3">
                        <span className="text-2xl">{subsection.icon}</span>
                        {subsection.piece}
                      </h3>
                      <ul className="space-y-2 text-white/80">
                        {subsection.rules.map((rule, ruleIdx) => (
                          <li key={ruleIdx} className="flex items-start gap-2">
                            <span className="text-blue-400 mt-1">•</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Quick Links */}
          <div className="card-lift rounded-3xl bg-white/[0.03] backdrop-blur-xl px-10 py-8 shadow-[0_14px_50px_rgba(0,0,0,0.45)]">
            <h2 className="text-2xl font-bold text-white mb-6">🚀 Ready to Play?</h2>
            <div className="flex flex-row gap-4 overflow-x-auto justify-center">
              <button
                onClick={() => navigate('/tutorial')}
                className="btn-secondary min-w-[250px] text-left"
              >
                <div className="text-lg mb-1">📚 Interactive Tutorial</div>
                <div className="text-sm text-white/80">Learn with hands-on practice</div>
              </button>
              <button
                onClick={() => navigate('/local?mode=bot')}
                className="btn-secondary min-w-[250px] text-left"
              >
                <div className="text-lg mb-1">🤖 Play vs Bot</div>
                <div className="text-sm text-white/80">Practice against AI</div>
              </button>
              <button
                onClick={() => navigate('/puzzles')}
                className="btn-secondary min-w-[250px] text-left"
              >
                <div className="text-lg mb-1">🧩 Tactical Puzzles</div>
                <div className="text-sm text-white/80">Improve your tactics</div>
              </button>
              <button
                onClick={() => navigate('/lobby')}
                className="btn-secondary min-w-[250px] text-left"
              >
                <div className="text-lg mb-1">⚔️ Play Online</div>
                <div className="text-sm text-white/80">Challenge other players</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChessRules;
