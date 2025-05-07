import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, Animated, Image, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

const BOARD_SIZE = 8;
const PIECES = {
  'white': {
    'pawn': '♟',
    'rook': '♜',
    'knight': '♞',
    'bishop': '♝',
    'queen': '♛',
    'king': '♚'
  },
  'black': {
    'pawn': '♙',
    'rook': '♖',
    'knight': '♘',
    'bishop': '♗',
    'queen': '♕',
    'king': '♔'
  }
};

const initialBoard = [
  ['black_rook', 'black_knight', 'black_bishop', 'black_queen', 'black_king', 'black_bishop', 'black_knight', 'black_rook'],
  ['black_pawn', 'black_pawn', 'black_pawn', 'black_pawn', 'black_pawn', 'black_pawn', 'black_pawn', 'black_pawn'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['white_pawn', 'white_pawn', 'white_pawn', 'white_pawn', 'white_pawn', 'white_pawn', 'white_pawn', 'white_pawn'],
  ['white_rook', 'white_knight', 'white_bishop', 'white_queen', 'white_king', 'white_bishop', 'white_knight', 'white_rook']
];

const INITIAL_TIME = 600; // 10 minutes in seconds

const TIME_OPTIONS = [3, 5, 7, 10]; // Time options in minutes

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Add chess notation conversion functions
const getFile = (col) => String.fromCharCode(97 + col);
const getRank = (row) => 8 - row;
const getSquareNotation = (row, col) => `${getFile(col)}${getRank(row)}`;

const getPieceSymbol = (piece) => {
  if (!piece) return '';
  const type = piece.split('_')[1];
  switch (type) {
    case 'knight': return 'N';
    case 'bishop': return 'B';
    case 'rook': return 'R';
    case 'queen': return 'Q';
    case 'king': return 'K';
    default: return '';
  }
};

const getMoveNotation = (move) => {
  const pieceSymbol = getPieceSymbol(move.piece);
  const fromSquare = getSquareNotation(move.from[0], move.from[1]);
  const toSquare = getSquareNotation(move.to[0], move.to[1]);
  const isCapture = move.captured ? 'x' : '';
  const isCheck = move.isCheck ? '+' : '';
  const isCheckmate = move.isCheckmate ? '#' : '';
  const promotion = move.isPromotion ? `=${move.promotedTo.toUpperCase()}` : '';
  
  return `${pieceSymbol}${isCapture}${toSquare}${promotion}${isCheck}${isCheckmate}`;
};

export default function ChessGame() {
  const router = useRouter();
  const [board, setBoard] = useState(initialBoard);
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState('white');
  const [validMoves, setValidMoves] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [winner, setWinner] = useState(null);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [capturedPieces, setCapturedPieces] = useState({ white: [], black: [] });
  const [moveHistory, setMoveHistory] = useState([]);
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [castlingRights, setCastlingRights] = useState({
    white: { kingSide: true, queenSide: true },
    black: { kingSide: true, queenSide: true }
  });
  const [showPromotionModal, setShowPromotionModal] = useState(false);
  const [promotionMove, setPromotionMove] = useState(null);
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showTimeSelectionModal, setShowTimeSelectionModal] = useState(true);
  const [selectedTime, setSelectedTime] = useState(5); // Default 5 minutes
  const [useTimer, setUseTimer] = useState(true); // New state for timer preference
  const timerRef = useRef(null);
  const [lastMove, setLastMove] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [isLoading, setIsLoading] = useState(true);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [showPauseMenu, setShowPauseMenu] = useState(false);
  const [playerNames, setPlayerNames] = useState({ white: '', black: '' });
  const [selectedColor, setSelectedColor] = useState(null);
  const [gameStatus, setGameStatus] = useState('');
  const [isKingInCheck, setIsKingInCheck] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [winTally, setWinTally] = useState({ white: 0, black: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);

  // Save game state to AsyncStorage
  useEffect(() => {
    const saveGameState = async () => {
      const gameState = {
        board,
        currentPlayer,
        capturedPieces,
        moveHistory,
        enPassantTarget,
        castlingRights
      };
      try {
        await AsyncStorage.setItem('chessGameState', JSON.stringify(gameState));
      } catch (error) {
        console.error('Error saving game state:', error);
      }
    };
    saveGameState();
  }, [board, currentPlayer, capturedPieces, moveHistory, enPassantTarget, castlingRights]);

  // Load game state from AsyncStorage
  useEffect(() => {
    const loadGameState = async () => {
      try {
        const savedState = await AsyncStorage.getItem('chessGameState');
        if (savedState) {
          const { board: savedBoard, currentPlayer: savedPlayer, 
                  capturedPieces: savedCaptured, moveHistory: savedMoves,
                  enPassantTarget: savedEnPassantTarget, castlingRights: savedCastlingRights } = JSON.parse(savedState);
          setBoard(savedBoard);
          setCurrentPlayer(savedPlayer);
          setCapturedPieces(savedCaptured);
          setMoveHistory(savedMoves);
          setEnPassantTarget(savedEnPassantTarget);
          setCastlingRights(savedCastlingRights);
        }
        // Load win tally
        await loadWinTally();
      } catch (error) {
        console.error('Error loading game state:', error);
      }
    };
    loadGameState();
  }, []);

  // Update timer effect to only run if timer is enabled
  useEffect(() => {
    if (isTimerRunning && useTimer) {
      timerRef.current = setInterval(() => {
        if (currentPlayer === 'white') {
          setWhiteTime(prev => {
            if (prev <= 0) {
              handleTimeUp('white');
              return 0;
            }
            return prev - 1;
          });
        } else {
          setBlackTime(prev => {
            if (prev <= 0) {
              handleTimeUp('black');
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isTimerRunning, currentPlayer, useTimer]);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  // Add this effect for the pulsing animation
  useEffect(() => {
    if (isKingInCheck) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isKingInCheck]);

  const isValidMove = (fromRow, fromCol, toRow, toCol) => {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;

    const isWhitePiece = piece.startsWith('white_');
    if ((isWhitePiece && currentPlayer === 'black') || (!isWhitePiece && currentPlayer === 'white')) {
      return false;
    }

    const destPiece = board[toRow][toCol];
    if (destPiece) {
      const isDestWhitePiece = destPiece.startsWith('white_');
      if ((isWhitePiece && isDestWhitePiece) || (!isWhitePiece && !isDestWhitePiece)) {
        return false;
      }
    }

    // Create a temporary board to test the move
    const tempBoard = board.map(row => [...row]);
    tempBoard[toRow][toCol] = piece;
    tempBoard[fromRow][fromCol] = null;

    // Check if the move would leave the king in check
    if (wouldBeInCheck(tempBoard, isWhitePiece)) {
      return false;
    }

    const pieceType = piece.split('_')[1];

    switch (pieceType) {
      case 'pawn':
        const direction = isWhitePiece ? -1 : 1;
        const startRow = isWhitePiece ? 6 : 1;
        
        // Forward move (one square)
        if (fromCol === toCol && toRow === fromRow + direction && !board[toRow][toCol]) {
          return true;
        }
        
        // Initial two-square move
        if (fromRow === startRow && fromCol === toCol && 
            toRow === fromRow + 2 * direction && 
            !board[fromRow + direction][fromCol] && 
            !board[toRow][toCol]) {
          return true;
        }
        
        // Normal capture
        if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction && board[toRow][toCol]) {
          return true;
        }

        // En passant capture
        if (enPassantTarget && 
            Math.abs(fromCol - toCol) === 1 && 
            toRow === fromRow + direction && 
            toRow === enPassantTarget.row && 
            toCol === enPassantTarget.col) {
          return true;
        }
        return false;

      case 'rook':
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return !isPathBlocked(tempBoard, fromRow, fromCol, toRow, toCol);

      case 'knight':
        return (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 1) ||
               (Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 2);

      case 'bishop':
        if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
        return !isPathBlocked(tempBoard, fromRow, fromCol, toRow, toCol);

      case 'queen':
        if (fromRow !== toRow && fromCol !== toCol && 
            Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
        return !isPathBlocked(tempBoard, fromRow, fromCol, toRow, toCol);

      case 'king':
        // Normal king move
        if (Math.abs(fromRow - toRow) <= 1 && Math.abs(fromCol - toCol) <= 1) {
          return true;
        }
        
        // Castling
        if (fromRow === toRow && Math.abs(fromCol - toCol) === 2) {
          const side = isWhitePiece ? 'white' : 'black';
          const isKingside = toCol > fromCol;
          
          // Check if castling is allowed
          if (!castlingRights[side][isKingside ? 'kingSide' : 'queenSide']) {
            return false;
          }

          // Check if king is in check or would move through check
          if (isInCheck(isWhitePiece) || 
              isSquareAttacked(isWhitePiece, fromRow, fromCol + (isKingside ? 1 : -1))) {
            return false;
          }

          const rookCol = isKingside ? 7 : 0;
          const rook = board[fromRow][rookCol];
          
          if (rook !== `${side}_rook`) return false;
          
          // Check if path is clear
          const direction = isKingside ? 1 : -1;
          for (let col = fromCol + direction; col !== rookCol; col += direction) {
            if (board[fromRow][col] || isSquareAttacked(isWhitePiece, fromRow, col)) {
              return false;
            }
          }
          
          return true;
        }
        return false;

      default:
        return false;
    }
  };

  const wouldBeInCheck = (boardState, isWhite) => {
    // Find the king's position
    const kingType = isWhite ? 'white_king' : 'black_king';
    let kingRow = -1;
    let kingCol = -1;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (boardState[row][col] === kingType) {
          kingRow = row;
          kingCol = col;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    // Check if any opponent piece can attack the king
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = boardState[row][col];
        if (piece && piece.startsWith(isWhite ? 'black_' : 'white_')) {
          // Use canAttackSquare instead of isValidMove for more accurate check detection
          if (canAttackSquare(boardState, row, col, kingRow, kingCol)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const canAttackSquare = (boardState, fromRow, fromCol, toRow, toCol) => {
    const piece = boardState[fromRow][fromCol];
    if (!piece) return false;

    const pieceType = piece.split('_')[1];
    const isWhitePiece = piece.startsWith('white_');

    switch (pieceType) {
      case 'pawn':
        const direction = isWhitePiece ? -1 : 1;
        // Pawns can only capture diagonally
        return Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction;

      case 'rook':
        if (fromRow !== toRow && fromCol !== toCol) return false;
        return !isPathBlocked(boardState, fromRow, fromCol, toRow, toCol);

      case 'knight':
        return (Math.abs(fromRow - toRow) === 2 && Math.abs(fromCol - toCol) === 1) ||
               (Math.abs(fromRow - toRow) === 1 && Math.abs(fromCol - toCol) === 2);

      case 'bishop':
        if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
        return !isPathBlocked(boardState, fromRow, fromCol, toRow, toCol);

      case 'queen':
        if (fromRow !== toRow && fromCol !== toCol && 
            Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
        return !isPathBlocked(boardState, fromRow, fromCol, toRow, toCol);

      case 'king':
        return Math.abs(fromRow - toRow) <= 1 && Math.abs(fromCol - toCol) <= 1;

      default:
        return false;
    }
  };

  const isPathBlocked = (boardState, fromRow, fromCol, toRow, toCol) => {
    const rowStep = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colStep = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
      if (boardState[currentRow][currentCol]) return true;
      currentRow += rowStep;
      currentCol += colStep;
    }
    return false;
  };

  const isInCheck = (isWhite) => {
    // Find the king
    const kingType = isWhite ? 'white_king' : 'black_king';
    let kingRow = -1;
    let kingCol = -1;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col] === kingType) {
          kingRow = row;
          kingCol = col;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    // Check if any opponent piece can attack the king
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece && piece.startsWith(isWhite ? 'black_' : 'white_')) {
          if (isValidMove(row, col, kingRow, kingCol)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const isSquareAttacked = (isWhite, row, col) => {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];
        if (piece && piece.startsWith(isWhite ? 'black_' : 'white_')) {
          if (isValidMove(r, c, row, col)) {
            return true;
          }
        }
      }
    }
    return false;
  };

  const handlePromotion = (pieceType) => {
    if (promotionMove) {
      const { fromRow, fromCol, toRow, toCol, piece } = promotionMove;
      const isWhitePiece = piece.startsWith('white_');
      const newBoard = board.map(row => [...row]);
      
      newBoard[toRow][toCol] = `${isWhitePiece ? 'white' : 'black'}_${pieceType}`;
      newBoard[fromRow][fromCol] = null;
      
      setBoard(newBoard);
      setShowPromotionModal(false);
      setPromotionMove(null);
      
      // Record the move
      const move = {
        piece: piece,
        from: [fromRow, fromCol],
        to: [toRow, toCol],
        captured: null,
        player: currentPlayer,
        isPromotion: true,
        promotedTo: pieceType
      };
      setMoveHistory(prev => [...prev, move]);
      
      setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
    }
  };

  const animateMove = (fromRow, fromCol, toRow, toCol) => {
    setLastMove({ from: [fromRow, fromCol], to: [toRow, toCol] });
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleTimeUp = (player) => {
    setGameOver(true);
    const winningPlayer = player === 'white' ? 'black' : 'white';
    setWinner(winningPlayer);
    setShowGameOverModal(true);
    setIsTimerRunning(false);
    
    // Update win tally
    const newTally = {
      ...winTally,
      [winningPlayer]: (winTally[winningPlayer] || 0) + 1
    };
    setWinTally(newTally);
    saveWinTally(newTally);
    
    // Save to leaderboard
    saveToLeaderboard(winningPlayer, player);
    
    // Show enhanced time up alert
    Alert.alert(
      "⏰ Time's Up! ⏰",
      `${playerNames[winningPlayer] || winningPlayer.toUpperCase()} wins by time!\n\n${playerNames[player] || player.toUpperCase()} ran out of time!`,
      [
        { 
          text: "New Game",
          onPress: resetGame,
          style: "default"
        },
        { 
          text: "Exit",
          onPress: handleExit,
          style: "cancel"
        }
      ]
    );
  };

  const handleCellPress = (row, col) => {
    if (gameOver) return;

    if (selectedPiece) {
      const [fromRow, fromCol] = selectedPiece;
      if (isValidMove(fromRow, fromCol, row, col)) {
        const newBoard = board.map(row => [...row]);
        const piece = board[fromRow][fromCol];
        const isWhitePiece = piece.startsWith('white_');
        const pieceType = piece.split('_')[1];
        const capturedPiece = newBoard[row][col];

        // Handle capture
        if (capturedPiece) {
          setCapturedPieces(prev => ({
            ...prev,
            [isWhitePiece ? 'white' : 'black']: [...prev[isWhitePiece ? 'white' : 'black'], capturedPiece]
          }));
        }

        // Move the piece
        newBoard[row][col] = piece;
        newBoard[fromRow][fromCol] = null;

        // Handle en passant capture
        if (pieceType === 'pawn' && enPassantTarget && 
            row === enPassantTarget.row && col === enPassantTarget.col) {
          const capturedPawnRow = fromRow;
          const capturedPawnCol = col;
          const capturedPawn = newBoard[capturedPawnRow][capturedPawnCol];
          newBoard[capturedPawnRow][capturedPawnCol] = null;
          setCapturedPieces(prev => ({
            ...prev,
            [isWhitePiece ? 'white' : 'black']: [...prev[isWhitePiece ? 'white' : 'black'], capturedPawn]
          }));
        }

        // Handle castling
        if (pieceType === 'king' && Math.abs(fromCol - col) === 2) {
          const isKingside = col > fromCol;
          const rookCol = isKingside ? 7 : 0;
          const newRookCol = isKingside ? col - 1 : col + 1;
          newBoard[row][newRookCol] = `${isWhitePiece ? 'white' : 'black'}_rook`;
          newBoard[fromRow][rookCol] = null;
          
          setCastlingRights(prev => ({
            ...prev,
            [isWhitePiece ? 'white' : 'black']: {
              kingSide: false,
              queenSide: false
            }
          }));
        }

        // Handle pawn promotion
        if (pieceType === 'pawn' && (row === 0 || row === 7)) {
          setPromotionMove({
            fromRow,
            fromCol,
            toRow: row,
            toCol: col,
            piece
          });
          setShowPromotionModal(true);
          setSelectedPiece(null);
          setValidMoves([]);
          return;
        }

        // Update en passant target
        if (pieceType === 'pawn' && Math.abs(fromRow - row) === 2) {
          setEnPassantTarget({
            row: (fromRow + row) / 2,
            col: col
          });
        } else {
          setEnPassantTarget(null);
        }

        // Update castling rights for rook moves
        if (pieceType === 'rook') {
          const side = isWhitePiece ? 'white' : 'black';
          const isKingside = fromCol === 7;
          setCastlingRights(prev => ({
            ...prev,
            [side]: {
              ...prev[side],
              [isKingside ? 'kingSide' : 'queenSide']: false
            }
          }));
        }

        // Record the move
        const move = {
          piece: piece,
          from: [fromRow, fromCol],
          to: [row, col],
          captured: capturedPiece,
          player: currentPlayer,
          isCastling: pieceType === 'king' && Math.abs(fromCol - col) === 2,
          isEnPassant: pieceType === 'pawn' && enPassantTarget && 
                      row === enPassantTarget.row && col === enPassantTarget.col,
          isPromotion: pieceType === 'pawn' && (row === 0 || row === 7)
        };
        setMoveHistory(prev => [...prev, move]);

        // Update board and switch player
        setBoard(newBoard);
        const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
        setCurrentPlayer(nextPlayer);
        
        // Check for game end conditions after the move
        setTimeout(() => {
          const isNextPlayerCheckmated = isCheckmate(nextPlayer === 'white');

          if (isNextPlayerCheckmated) {
            setGameOver(true);
            setWinner(currentPlayer);
            setGameStatus('CHECKMATE!');
            setIsKingInCheck(false);
            setShowGameOverModal(true);
            setIsTimerRunning(false);
            
            // Update win tally
            const newTally = {
              ...winTally,
              [currentPlayer]: (winTally[currentPlayer] || 0) + 1
            };
            setWinTally(newTally);
            saveWinTally(newTally);
            
            // Save to leaderboard
            saveToLeaderboard(currentPlayer, nextPlayer);
            
            // Show checkmate alert
            Alert.alert(
              "Checkmate!",
              `${playerNames[currentPlayer] || currentPlayer.toUpperCase()} wins by checkmate!`,
              [
                { 
                  text: "New Game",
                  onPress: resetGame,
                  style: "default"
                },
                { 
                  text: "Exit",
                  onPress: handleExit,
                  style: "cancel"
                }
              ]
            );
          } else if (isInCheck(nextPlayer === 'white')) {
            setGameStatus('CHECK!');
            setIsKingInCheck(true);
            Alert.alert(
              "Check!",
              `${playerNames[nextPlayer] || nextPlayer.toUpperCase()} king is in check!`,
              [{ text: "OK" }]
            );
          } else {
            setGameStatus('');
            setIsKingInCheck(false);
          }
        }, 100);

        // Animate the move
        animateMove(fromRow, fromCol, row, col);
      }
      setSelectedPiece(null);
      setValidMoves([]);
    } else {
      const piece = board[row][col];
      if (piece) {
        const isWhitePiece = piece.startsWith('white_');
        if ((isWhitePiece && currentPlayer === 'white') || (!isWhitePiece && currentPlayer === 'black')) {
          setSelectedPiece([row, col]);
          const moves = [];
          for (let i = 0; i < BOARD_SIZE; i++) {
            for (let j = 0; j < BOARD_SIZE; j++) {
              if (isValidMove(row, col, i, j)) {
                moves.push([i, j]);
              }
            }
          }
          setValidMoves(moves);
        }
      }
    }
  };

  const handleTimeSelection = (minutes) => {
    setSelectedTime(minutes);
    if (useTimer) {
      setWhiteTime(minutes * 60);
      setBlackTime(minutes * 60);
    }
    setShowTimeSelectionModal(false);
    setIsTimerRunning(useTimer);
  };

  const handleTimerToggle = (useTimerValue) => {
    setUseTimer(useTimerValue);
    if (!useTimerValue) {
      setWhiteTime(0);
      setBlackTime(0);
    } else {
      setWhiteTime(selectedTime * 60);
      setBlackTime(selectedTime * 60);
    }
  };

  const resetGame = () => {
    setBoard(initialBoard);
    setCurrentPlayer('white');
    setSelectedPiece(null);
    setValidMoves([]);
    setGameOver(false);
    setWinner(null);
    setShowGameOverModal(false);
    setCapturedPieces({ white: [], black: [] });
    setMoveHistory([]);
    setEnPassantTarget(null);
    setCastlingRights({
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true }
    });
    setWhiteTime(selectedTime * 60);
    setBlackTime(selectedTime * 60);
    setIsTimerRunning(useTimer);
    setGameStatus('');
    setWinTally({ white: 0, black: 0 });
    saveWinTally({ white: 0, black: 0 });
    AsyncStorage.removeItem('chessGameState');
  };

  const renderCell = (row, col) => {
    const piece = board[row][col];
    const isSelected = selectedPiece && selectedPiece[0] === row && selectedPiece[1] === col;
    const isValidMoveCell = validMoves.some(([r, c]) => r === row && c === col);
    const isEven = (row + col) % 2 === 0;
    const isLastMove = lastMove && 
      ((lastMove.from[0] === row && lastMove.from[1] === col) || 
       (lastMove.to[0] === row && lastMove.to[1] === col));

    // Check if this cell contains a king in check
    const isKingInCheckCell = piece && 
      ((piece === 'white_king' && isInCheck(true)) || 
       (piece === 'black_king' && isInCheck(false)));

    const showNumber = col === 0;
    const showLetter = row === 7;
    const number = 8 - row;
    const letter = String.fromCharCode(97 + col);

    if (piece) {
      const isWhitePiece = piece.startsWith('white_');
      const pieceType = piece.split('_')[1];

      return (
        <TouchableOpacity
          key={`cell-${row}-${col}`}
          style={[
            styles.cell,
            isEven ? styles.lightCell : styles.darkCell,
            isSelected && styles.selectedCell,
            isValidMoveCell && styles.validMoveCell,
            isLastMove && styles.lastMoveCell,
            isKingInCheckCell && styles.kingInCheckCell
          ]}
          onPress={() => handleCellPress(row, col)}
        >
          <View style={styles.pieceContainer}>
            {isKingInCheckCell ? (
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <Text style={[
                  styles.piece,
                  isWhitePiece ? styles.whitePiece : styles.blackPiece,
                  styles.kingInCheckPiece
                ]}>
                  {isWhitePiece ? PIECES.white[pieceType] : PIECES.black[pieceType]}
                </Text>
              </Animated.View>
            ) : (
              <Text style={[
                styles.piece,
                isWhitePiece ? styles.whitePiece : styles.blackPiece
              ]}>
                {isWhitePiece ? PIECES.white[pieceType] : PIECES.black[pieceType]}
              </Text>
            )}
          </View>
          {showNumber && (
            <Text style={[styles.cellCoordinate, styles.cellNumber]}>
              {number}
            </Text>
          )}
          {showLetter && (
            <Text style={[styles.cellCoordinate, styles.cellLetter]}>
              {letter}
            </Text>
          )}
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={`cell-${row}-${col}`}
        style={[
          styles.cell,
          isEven ? styles.lightCell : styles.darkCell,
          isSelected && styles.selectedCell,
          isValidMoveCell && styles.validMoveCell,
          isLastMove && styles.lastMoveCell
        ]}
        onPress={() => handleCellPress(row, col)}
      >
        {isValidMoveCell && (
          <View style={styles.validMoveIndicator} />
        )}
        {showNumber && (
          <Text style={[styles.cellCoordinate, styles.cellNumber]}>
            {number}
          </Text>
        )}
        {showLetter && (
          <Text style={[styles.cellCoordinate, styles.cellLetter]}>
            {letter}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  const handleStartGame = () => {
    if (!selectedColor || !playerNames[selectedColor]) {
      Alert.alert(
        "Setup Required",
        "Please select your color and enter your name to start the game.",
        [{ text: "OK" }]
      );
      return;
    }
    setShowStartScreen(false);
    setShowTimeSelectionModal(true);
  };

  const handlePause = () => {
    setShowPauseMenu(true);
    setIsTimerRunning(false);
  };

  const handleResume = () => {
    setShowPauseMenu(false);
    setIsTimerRunning(true);
  };

  const handleExit = () => {
    router.replace('/');
  };

  const handleColorSelection = (color) => {
    setSelectedColor(color);
  };

  const handleNameChange = (color, name) => {
    setPlayerNames(prev => {
      const newNames = {
        ...prev,
        [color]: name
      };
      
      // Reset win tally if either player name has changed
      if (prev[color] !== name) {
        setWinTally({ white: 0, black: 0 });
        saveWinTally({ white: 0, black: 0 });
      }
      
      return newNames;
    });
  };

  const isCheckmate = (isWhite) => {
    // First check if the king is in check
    if (!isInCheck(isWhite)) return false;

    // Find the king's position
    const kingType = isWhite ? 'white_king' : 'black_king';
    let kingRow = -1;
    let kingCol = -1;
    
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col] === kingType) {
          kingRow = row;
          kingCol = col;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    // Try all possible moves for all pieces of the current player
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece && piece.startsWith(isWhite ? 'white_' : 'black_')) {
          // Try all possible moves for this piece
          for (let toRow = 0; toRow < BOARD_SIZE; toRow++) {
            for (let toCol = 0; toCol < BOARD_SIZE; toCol++) {
              if (isValidMove(row, col, toRow, toCol)) {
                // Create a temporary board to test the move
                const tempBoard = board.map(r => [...r]);
                tempBoard[toRow][toCol] = piece;
                tempBoard[row][col] = null;

                // Check if the move would get the king out of check
                if (!wouldBeInCheck(tempBoard, isWhite)) {
                  return false; // Found a valid move that gets out of check
                }
              }
            }
          }
        }
      }
    }

    // Check if the king can move to any adjacent square
    const kingMoves = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ];

    for (const [rowOffset, colOffset] of kingMoves) {
      const newRow = kingRow + rowOffset;
      const newCol = kingCol + colOffset;

      if (newRow >= 0 && newRow < BOARD_SIZE && newCol >= 0 && newCol < BOARD_SIZE) {
        if (isValidMove(kingRow, kingCol, newRow, newCol)) {
          // Create a temporary board to test the king's move
          const tempBoard = board.map(r => [...r]);
          tempBoard[newRow][newCol] = kingType;
          tempBoard[kingRow][kingCol] = null;

          // Check if the king would be safe in the new position
          if (!wouldBeInCheck(tempBoard, isWhite)) {
            return false; // King can move to a safe square
          }
        }
      }
    }

    // If we get here, no valid moves were found that get out of check
    return true;
  };

  // Update the loadWinTally function to handle leaderboard
  const loadWinTally = async () => {
    try {
      const savedTally = await AsyncStorage.getItem('chessWinTally');
      const savedNames = await AsyncStorage.getItem('chessPlayerNames');
      const savedLeaderboard = await AsyncStorage.getItem('chessLeaderboard');
      
      if (savedTally && savedNames) {
        const parsedNames = JSON.parse(savedNames);
        // Only load tally if the player names match
        if (parsedNames.white === playerNames.white && parsedNames.black === playerNames.black) {
          setWinTally(JSON.parse(savedTally));
        } else {
          // Reset tally if names don't match
          setWinTally({ white: 0, black: 0 });
          saveWinTally({ white: 0, black: 0 });
        }
      }

      // Load leaderboard
      if (savedLeaderboard) {
        setLeaderboard(JSON.parse(savedLeaderboard));
      }
    } catch (error) {
      console.error('Error loading win tally and leaderboard:', error);
    }
  };

  // Update saveWinTally to handle leaderboard
  const saveWinTally = async (newTally) => {
    try {
      await AsyncStorage.setItem('chessWinTally', JSON.stringify(newTally));
      await AsyncStorage.setItem('chessPlayerNames', JSON.stringify(playerNames));
    } catch (error) {
      console.error('Error saving win tally:', error);
    }
  };

  // Add function to save to leaderboard
  const saveToLeaderboard = async (winner, loser) => {
    try {
      const newEntry = {
        winner: playerNames[winner] || winner.toUpperCase(),
        loser: playerNames[loser] || loser.toUpperCase(),
        date: new Date().toISOString(),
        winType: gameStatus === 'CHECKMATE!' ? 'Checkmate' : 'Time'
      };

      const updatedLeaderboard = [...leaderboard, newEntry];
      // Keep only the last 50 games
      if (updatedLeaderboard.length > 50) {
        updatedLeaderboard.shift();
      }
      
      setLeaderboard(updatedLeaderboard);
      await AsyncStorage.setItem('chessLeaderboard', JSON.stringify(updatedLeaderboard));
    } catch (error) {
      console.error('Error saving to leaderboard:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="light" />
        <Animated.View style={[styles.loadingContent, { opacity: fadeAnim }]}>
          <Text style={styles.loadingText}>Loading Chess Game</Text>
          <View style={styles.loadingDots}>
            <Text style={styles.loadingDot}>.</Text>
            <Text style={styles.loadingDot}>.</Text>
            <Text style={styles.loadingDot}>.</Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (showStartScreen) {
    return (
      <View style={[styles.container, styles.startContainer]}>
        <StatusBar style="light" />
        <Animated.View 
          style={[
            styles.startContent,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Text style={styles.gameTitle}>Chess Game</Text>
          <Text style={styles.gameSubtitle}>Challenge Your Mind</Text>
          
          <View style={styles.playerSetupContainer}>
            <Text style={styles.setupTitle}>Step 1: Choose Your Color</Text>
            <View style={styles.colorSelectionContainer}>
              <TouchableOpacity
                style={[
                  styles.colorButton,
                  selectedColor === 'white' && styles.selectedColorButton
                ]}
                onPress={() => handleColorSelection('white')}
              >
                <Text style={styles.colorButtonText}>White</Text>
                <Text style={styles.colorButtonSubtext}>First Move</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.colorButton,
                  selectedColor === 'black' && styles.selectedColorButton
                ]}
                onPress={() => handleColorSelection('black')}
              >
                <Text style={styles.colorButtonText}>Black</Text>
                <Text style={styles.colorButtonSubtext}>Second Move</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.nameInputContainer}>
              <Text style={styles.setupTitle}>Step 2: Enter Your Name</Text>
              <TextInput
                style={[
                  styles.nameInput,
                  selectedColor === 'white' && styles.activeNameInput
                ]}
                placeholder="Enter your name"
                placeholderTextColor="#bdc3c7"
                value={playerNames.white}
                onChangeText={(text) => handleNameChange('white', text)}
                editable={selectedColor === 'white'}
              />
              <TextInput
                style={[
                  styles.nameInput,
                  selectedColor === 'black' && styles.activeNameInput
                ]}
                placeholder="Enter your name"
                placeholderTextColor="#bdc3c7"
                value={playerNames.black}
                onChangeText={(text) => handleNameChange('black', text)}
                editable={selectedColor === 'black'}
              />
            </View>

            <View style={styles.setupStatusContainer}>
              <Text style={styles.setupStatusText}>
                {!selectedColor 
                  ? "Please select your color"
                  : !playerNames[selectedColor]
                    ? "Please enter your name"
                    : "Ready to start!"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.startButton,
              (!selectedColor || !playerNames[selectedColor]) && styles.disabledButton
            ]}
            onPress={handleStartGame}
            disabled={!selectedColor || !playerNames[selectedColor]}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.chessTheme]}>
      <StatusBar style="light" />
      <View style={styles.headerContainer}>
        <Text style={[styles.header, styles.chessText]}>
          {currentPlayer === 'white' 
            ? `${playerNames.white || 'White'}'s turn`
            : `${playerNames.black || 'Black'}'s turn`}
        </Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.leaderboardButton}
            onPress={() => setShowLeaderboardModal(true)}
          >
            <Text style={styles.leaderboardButtonText}>🏆</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pauseButton}
            onPress={handlePause}
          >
            <Text style={styles.pauseButtonText}>⏸</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.timerContainer}>
        <View style={[styles.timer, currentPlayer === 'black' && styles.activeTimer]}>
          <Text style={[styles.timerText, styles.chessText]}>
            Black: {formatTime(blackTime)}
          </Text>
        </View>
        <View style={[styles.timer, currentPlayer === 'white' && styles.activeTimer]}>
          <Text style={[styles.timerText, styles.chessText]}>
            White: {formatTime(whiteTime)}
          </Text>
        </View>
      </View>

      <View style={styles.gameContainer}>
        <View style={styles.boardContainer}>
          <View style={styles.board}>
            {board.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.row}>
                {row.map((_, colIndex) => renderCell(rowIndex, colIndex))}
              </View>
            ))}
          </View>

          {/* Game Status Display */}
          {gameStatus && (
            <View style={[
              styles.gameStatusContainer,
              gameStatus === 'CHECKMATE!' ? styles.checkmateStatus : styles.checkStatus
            ]}>
              <Text style={styles.gameStatusText}>{gameStatus}</Text>
            </View>
          )}

          <View style={styles.capturedContainer}>
            <View style={styles.capturedSection}>
              <Text style={[styles.capturedTitle, styles.chessText]}>White's Captures:</Text>
              <View style={styles.capturedPiecesList}>
                {capturedPieces.white.map((piece, index) => (
                  <Text 
                    key={`white-captured-${index}-${piece}`} 
                    style={[styles.capturedPiece, styles.blackPiece]}
                  >
                    {PIECES.black[piece.split('_')[1]]}
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.capturedSection}>
              <Text style={[styles.capturedTitle, styles.chessText]}>Black's Captures:</Text>
              <View style={styles.capturedPiecesList}>
                {capturedPieces.black.map((piece, index) => (
                  <Text 
                    key={`black-captured-${index}-${piece}`} 
                    style={[styles.capturedPiece, styles.whitePiece]}
                  >
                    {PIECES.white[piece.split('_')[1]]}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        </View>

        <ScrollView style={styles.moveHistoryContainer}>
          <Text style={[styles.moveHistoryTitle, styles.chessText]}>Move History:</Text>
          {moveHistory.map((move, index) => (
            <Text 
              key={`move-${index}-${move.from[0]}-${move.from[1]}-${move.to[0]}-${move.to[1]}`} 
              style={[styles.moveHistoryText, styles.chessText]}
            >
              {Math.floor(index / 2) + 1}. {index % 2 === 0 ? '' : '...'} 
              {playerNames[move.player] || move.player.toUpperCase()}: {getMoveNotation(move)}
            </Text>
          ))}
        </ScrollView>
      </View>

      <Modal
        visible={showGameOverModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.chessModal]}>
            <Text style={[styles.modalTitle, styles.chessText]}>
              {winner ? `${winner.toUpperCase()} Wins!` : 'Game Over'}
            </Text>
            <Text style={[styles.modalText, styles.chessText]}>
              {whiteTime === 0 ? `${playerNames.black || 'BLACK'} wins by time` :
               blackTime === 0 ? `${playerNames.white || 'WHITE'} wins by time` :
               winner ? `${playerNames[winner] || winningPlayer.toUpperCase()} wins by checkmate` : 'Game ended'}
            </Text>
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.chessButton]}
                onPress={resetGame}
              >
                <Text style={styles.modalButtonText}>New Game</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.chessButton]}
                onPress={handleExit}
              >
                <Text style={styles.modalButtonText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPromotionModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.chessModal]}>
            <Text style={[styles.modalTitle, styles.chessText]}>
              Choose Promotion Piece
            </Text>
            <View style={styles.promotionButtons}>
              {['queen', 'rook', 'bishop', 'knight'].map((piece) => (
                <TouchableOpacity
                  key={`promotion-${piece}`}
                  style={[styles.promotionButton, styles.chessButton]}
                  onPress={() => handlePromotion(piece)}
                >
                  <Text style={[styles.promotionPiece, 
                    currentPlayer === 'white' ? styles.whitePiece : styles.blackPiece]}>
                    {currentPlayer === 'white' ? PIECES.white[piece] : PIECES.black[piece]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showTimeSelectionModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.chessModal]}>
            <Text style={[styles.modalTitle, styles.chessText]}>
              Game Settings
            </Text>
            
            <View style={styles.timerToggleContainer}>
              <Text style={[styles.timerToggleLabel, styles.chessText]}>Use Timer:</Text>
              <View style={styles.timerToggleButtons}>
                <TouchableOpacity
                  style={[
                    styles.timerToggleButton,
                    useTimer && styles.selectedTimerToggle
                  ]}
                  onPress={() => handleTimerToggle(true)}
                >
                  <Text style={styles.timerToggleText}>Yes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.timerToggleButton,
                    !useTimer && styles.selectedTimerToggle
                  ]}
                  onPress={() => handleTimerToggle(false)}
                >
                  <Text style={styles.timerToggleText}>No</Text>
                </TouchableOpacity>
              </View>
            </View>

            {useTimer && (
              <View style={styles.timeSelectionContainer}>
                <Text style={[styles.timeSelectionTitle, styles.chessText]}>
                  Select Game Duration
                </Text>
                {TIME_OPTIONS.map((minutes) => (
                  <TouchableOpacity
                    key={`time-${minutes}`}
                    style={[
                      styles.timeButton,
                      selectedTime === minutes && styles.selectedTimeButton
                    ]}
                    onPress={() => handleTimeSelection(minutes)}
                  >
                    <Text style={[styles.timeButtonText, styles.chessText]}>
                      {minutes} minutes
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!useTimer && (
              <TouchableOpacity
                style={[styles.timeButton, styles.selectedTimeButton]}
                onPress={() => handleTimeSelection(0)}
              >
                <Text style={[styles.timeButtonText, styles.chessText]}>
                  Start Game Without Timer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={showPauseMenu}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.chessModal]}>
            <Text style={[styles.modalTitle, styles.chessText]}>
              Game Paused
            </Text>
            <View style={styles.pauseMenuButtons}>
              <TouchableOpacity
                style={[styles.pauseMenuButton, styles.chessButton]}
                onPress={handleResume}
              >
                <Text style={styles.modalButtonText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pauseMenuButton, styles.chessButton]}
                onPress={resetGame}
              >
                <Text style={styles.modalButtonText}>Restart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.pauseMenuButton, styles.chessButton]}
                onPress={handleExit}
              >
                <Text style={styles.modalButtonText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.tallyContainer}>
        <Text style={[styles.tallyText, styles.chessText]}>
          {playerNames.white || 'White'}: {winTally.white} wins
        </Text>
        <Text style={[styles.tallyText, styles.chessText]}>
          {playerNames.black || 'Black'}: {winTally.black} wins
        </Text>
      </View>

      <Modal
        visible={showLeaderboardModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.chessModal]}>
            <Text style={[styles.modalTitle, styles.chessText]}>
              Leaderboard
            </Text>
            <ScrollView style={styles.leaderboardList}>
              {leaderboard.map((entry, index) => (
                <View key={index} style={styles.leaderboardEntry}>
                  <Text style={[styles.leaderboardText, styles.chessText]}>
                    {entry.winner} defeated {entry.loser} by {entry.winType}
                  </Text>
                  <Text style={[styles.leaderboardDate, styles.chessText]}>
                    {new Date(entry.date).toLocaleDateString()}
                  </Text>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalButton, styles.chessButton]}
              onPress={() => setShowLeaderboardModal(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 10,
  },
  chessTheme: {
    backgroundColor: '#2c3e50',
  },
  chessText: {
    color: '#ecf0f1',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: '#34495e',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  gameContainer: {
    flex: 1,
    alignItems: 'center',
  },
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flex: 1,
  },
  board: {
    aspectRatio: 1,
    width: '100%',
    maxWidth: 500,
    backgroundColor: '#8B4513',
    borderRadius: 12,
    padding: 10,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: '#DAA520',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cellCoordinate: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: 'bold',
  },
  cellNumber: {
    left: 2,
    top: 2,
    color: '#000000',
  },
  cellLetter: {
    right: 2,
    bottom: 2,
    color: '#000000',
  },
  lightCell: {
    backgroundColor: '#F0D9B5', // Light wood color
  },
  darkCell: {
    backgroundColor: '#B58863', // Dark wood color
  },
  selectedCell: {
    backgroundColor: 'rgba(123, 97, 255, 0.5)',
  },
  validMoveCell: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  lastMoveCell: {
    backgroundColor: 'rgba(255, 193, 7, 0.3)',
  },
  validMoveIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 175, 80, 0.5)',
    position: 'absolute',
  },
  pieceContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  piece: {
    fontSize: 45,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  whitePiece: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
  },
  blackPiece: {
    color: '#000000',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
  },
  capturedContainer: {
    width: '95%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#34495e',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  capturedSection: {
    flex: 1,
    alignItems: 'center',
  },
  capturedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  capturedPiecesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 5,
  },
  capturedPiece: {
    fontSize: 24,
  },
  moveHistoryContainer: {
    width: '100%',
    maxHeight: 150,
    backgroundColor: '#34495e',
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  moveHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  moveHistoryText: {
    fontSize: 14,
    marginBottom: 3,
  },
  chessButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  chessModal: {
    backgroundColor: '#34495e',
    padding: 20,
    borderRadius: 15,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  modalButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  promotionButton: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#34495e',
    minWidth: 60,
    alignItems: 'center',
  },
  promotionPiece: {
    fontSize: 30,
  },
  timeSelectionContainer: {
    width: '100%',
    padding: 10,
  },
  timeButton: {
    backgroundColor: '#34495e',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    alignItems: 'center',
  },
  selectedTimeButton: {
    backgroundColor: '#2ecc71',
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  timer: {
    backgroundColor: '#34495e',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  activeTimer: {
    backgroundColor: '#2ecc71',
  },
  timerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    backgroundColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#ecf0f1',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  loadingDots: {
    flexDirection: 'row',
  },
  loadingDot: {
    color: '#ecf0f1',
    fontSize: 32,
    fontWeight: 'bold',
    marginHorizontal: 2,
  },
  startContainer: {
    backgroundColor: '#2c3e50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startContent: {
    alignItems: 'center',
    padding: 20,
  },
  gameTitle: {
    color: '#ecf0f1',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  gameSubtitle: {
    color: '#bdc3c7',
    fontSize: 24,
    marginBottom: 40,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  pauseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#3498db',
  },
  pauseButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  pauseMenuButtons: {
    width: '100%',
    gap: 15,
  },
  pauseMenuButton: {
    width: '100%',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  playerSetupContainer: {
    width: '100%',
    padding: 20,
    backgroundColor: '#34495e',
    borderRadius: 15,
    marginBottom: 30,
  },
  setupTitle: {
    color: '#ecf0f1',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  colorSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  colorButton: {
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#3498db',
    minWidth: 120,
    alignItems: 'center',
  },
  selectedColorButton: {
    backgroundColor: '#2ecc71',
  },
  colorButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  colorButtonSubtext: {
    color: '#ffffff',
    fontSize: 12,
    marginTop: 5,
  },
  nameInputContainer: {
    width: '100%',
  },
  nameInput: {
    backgroundColor: '#2c3e50',
    color: '#ecf0f1',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    fontSize: 16,
    opacity: 0.5,
  },
  activeNameInput: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#3498db',
  },
  setupStatusContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#2c3e50',
    borderRadius: 8,
  },
  setupStatusText: {
    color: '#ecf0f1',
    fontSize: 16,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  timerToggleContainer: {
    width: '100%',
    marginBottom: 20,
    alignItems: 'center',
  },
  timerToggleLabel: {
    fontSize: 18,
    marginBottom: 10,
  },
  timerToggleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  timerToggleButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#34495e',
    minWidth: 80,
    alignItems: 'center',
  },
  selectedTimerToggle: {
    backgroundColor: '#2ecc71',
  },
  timerToggleText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeSelectionTitle: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
  },
  gameStatusContainer: {
    width: '95%',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
    alignItems: 'center',
  },
  checkStatus: {
    backgroundColor: '#e74c3c',
  },
  checkmateStatus: {
    backgroundColor: '#c0392b',
  },
  gameStatusText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  kingInCheckCell: {
    backgroundColor: 'rgba(255, 0, 0, 0.6)',
    borderWidth: 4,
    borderColor: '#ff0000',
    shadowColor: '#ff0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 8,
  },
  kingInCheckPiece: {
    color: '#ff0000',
    textShadowColor: '#ff0000',
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 6,
    fontSize: 40,
  },
  tallyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 5,
  },
  tallyText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  leaderboardButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#3498db',
  },
  leaderboardButtonText: {
    fontSize: 24,
  },
  leaderboardList: {
    width: '100%',
    maxHeight: 300,
  },
  leaderboardEntry: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
  },
  leaderboardText: {
    fontSize: 16,
    marginBottom: 5,
  },
  leaderboardDate: {
    fontSize: 12,
    color: '#bdc3c7',
  },
}); 