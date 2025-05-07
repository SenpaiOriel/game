import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, Animated, Image, TextInput, Dimensions } from 'react-native';
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
  if (!move) return '';
  return `${move.piece || ''} ${move.from ? `${move.from[0]},${move.from[1]}` : ''} -> ${move.to ? `${move.to[0]},${move.to[1]}` : ''}`;
};

// Add these constants at the top with other constants
const DRAW_CONDITIONS = {
  STALEMATE: 'Stalemate',
  INSUFFICIENT_MATERIAL: 'Insufficient Material',
  THREE_FOLD_REPETITION: 'Threefold Repetition',
  FIFTY_MOVE_RULE: 'Fifty-Move Rule',
  AGREEMENT: 'Draw by Agreement'
};

// Add these constants at the top with other constants
const CHESS_INSIGHTS = {
  OPENING_PRINCIPLES: {
    CENTER_CONTROL: 'Control the center squares (d4, d5, e4, e5)',
    PIECE_DEVELOPMENT: 'Develop knights and bishops early',
    KING_SAFETY: 'Castle early to protect the king',
    PAWN_STRUCTURE: 'Avoid doubled or isolated pawns'
  },
  MIDGAME_PRINCIPLES: {
    PIECE_ACTIVITY: 'Keep pieces active and coordinated',
    SPACE_ADVANTAGE: 'Control more space on the board',
    KING_POSITION: 'Keep king safe and consider king activity',
    MATERIAL_BALANCE: 'Maintain material equality or advantage'
  },
  ENDGAME_PRINCIPLES: {
    KING_ACTIVITY: 'Activate the king in the endgame',
    PAWN_PROMOTION: 'Push passed pawns toward promotion',
    PIECE_COORDINATION: 'Coordinate pieces for checkmate',
    MATERIAL_EVALUATION: 'Evaluate material and position'
  }
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
  const [winType, setWinType] = useState(''); // 'Checkmate' or 'Time'
  const [gameMode, setGameMode] = useState('pvp'); // 'pvp' or 'ai'
  const [captureAnim] = useState(new Animated.Value(1));
  const [selectedDifficulty, setSelectedDifficulty] = useState('medium');
  const [showCheckmateSequence, setShowCheckmateSequence] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [timeUpWinner, setTimeUpWinner] = useState(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [moveCount, setMoveCount] = useState(0); // For fifty-move rule
  const [positionHistory, setPositionHistory] = useState([]); // For threefold repetition
  const [drawOffer, setDrawOffer] = useState(null);
  const [insufficientMaterial, setInsufficientMaterial] = useState(false);

  // Define all handler functions at the top level
  const handleColorSelection = (color) => {
    setSelectedColor(color);
    // Clear the name input when changing color
    setPlayerNames(prev => ({
      ...prev,
      [color]: ''
    }));
  };

  const handleNameChange = (color, name) => {
    setPlayerNames(prev => ({
      ...prev,
      [color]: name
    }));
  };

  const handleTimerToggle = (useTimerValue) => {
    setUseTimer(useTimerValue);
  };

  const handleTimeSelection = (minutes) => {
    setSelectedTime(minutes);
    setShowTimeSelectionModal(false);
  };

  const handlePause = () => {
    setIsTimerRunning(false);
    setShowPauseMenu(true);
  };

  const handleResume = () => {
    setIsTimerRunning(true);
    setShowPauseMenu(false);
  };

  const handleExit = async () => {
    try {
      // Clear all saved game data
      await AsyncStorage.removeItem('chessGameState');
      await AsyncStorage.removeItem('chessLeaderboard');
      await AsyncStorage.removeItem('chessPlayerNames');
      
      // Reset all game state with default values
      setBoard(initialBoard || []);
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
      setWhiteTime(selectedTime ? selectedTime * 60 : 600);
      setBlackTime(selectedTime ? selectedTime * 60 : 600);
      setIsTimerRunning(false);
      setGameStatus('');
      setIsKingInCheck(false);
      setLastMove(null);
      setLeaderboard([]);
      setPlayerNames({ white: '', black: '' });
      setSelectedColor(null);
      setShowStartScreen(true);
      setShowPauseMenu(false);
      setShowTimeSelectionModal(false);
      setShowPromotionModal(false);
      setShowLeaderboardModal(false);
      setShowTimeUpModal(false);
      setShowRulesModal(false);
      setPromotionMove(null);
      setTimeUpWinner(null);
      setWinType('');
      setMoveCount(0);
      setPositionHistory([]);
      setDrawOffer(null);
      setInsufficientMaterial(false);
      
      // Navigate back
      router.back();
    } catch (error) {
      console.error('Error clearing game data:', error);
      // Ensure we still navigate back even if there's an error
      router.back();
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
    setIsKingInCheck(false);
    setLastMove(null);
    setShowTimeSelectionModal(false);
    AsyncStorage.removeItem('chessGameState');
    setMoveCount(0);
    setPositionHistory([]);
    setDrawOffer(null);
    setInsufficientMaterial(false);
  };

  const handleStartGame = () => {
    // Set up AI player if in AI mode
    if (gameMode === 'ai') {
      const humanColor = selectedColor;
      const aiColor = humanColor === 'white' ? 'black' : 'white';
      setPlayerNames(prev => ({
        ...prev,
        [aiColor]: 'Computer'
      }));
    }

    // Set initial game state
    setShowStartScreen(false);
    setShowTimeSelectionModal(true);
    setIsTimerRunning(useTimer);
    setWhiteTime(selectedTime * 60);
    setBlackTime(selectedTime * 60);
    setGameStatus('');
    setIsKingInCheck(false);
    setLastMove(null);
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

    // Clear any saved game state
    AsyncStorage.removeItem('chessGameState');
  };

  // Add this after the other constants
  const DIFFICULTY_OPTIONS = [
    { value: 'easy', label: 'Easy', description: 'Suitable for beginners' },
    { value: 'medium', label: 'Medium', description: 'Balanced challenge' },
    { value: 'hard', label: 'Hard', description: 'For experienced players' }
  ];

  // Add piece values for evaluation
  const PIECE_VALUES = {
    'pawn': 1,
    'knight': 3,
    'bishop': 3,
    'rook': 5,
    'queen': 9,
    'king': 100
  };

  // Add piece position values for better strategic play
  const PIECE_POSITION_VALUES = {
    'pawn': [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [50, 50, 50, 50, 50, 50, 50, 50],
      [10, 10, 20, 30, 30, 20, 10, 10],
      [5, 5, 10, 25, 25, 10, 5, 5],
      [0, 0, 0, 20, 20, 0, 0, 0],
      [5, -5, -10, 0, 0, -10, -5, 5],
      [5, 10, 10, -20, -20, 10, 10, 5],
      [0, 0, 0, 0, 0, 0, 0, 0]
    ],
    'knight': [
      [-50, -40, -30, -30, -30, -30, -40, -50],
      [-40, -20, 0, 0, 0, 0, -20, -40],
      [-30, 0, 10, 15, 15, 10, 0, -30],
      [-30, 5, 15, 20, 20, 15, 5, -30],
      [-30, 0, 15, 20, 20, 15, 0, -30],
      [-30, 5, 10, 15, 15, 10, 5, -30],
      [-40, -20, 0, 5, 5, 0, -20, -40],
      [-50, -40, -30, -30, -30, -30, -40, -50]
    ],
    'bishop': [
      [-20, -10, -10, -10, -10, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 10, 10, 5, 0, -10],
      [-10, 5, 5, 10, 10, 5, 5, -10],
      [-10, 0, 10, 10, 10, 10, 0, -10],
      [-10, 10, 10, 10, 10, 10, 10, -10],
      [-10, 5, 0, 0, 0, 0, 5, -10],
      [-20, -10, -10, -10, -10, -10, -10, -20]
    ],
    'rook': [
      [0, 0, 0, 0, 0, 0, 0, 0],
      [5, 10, 10, 10, 10, 10, 10, 5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [-5, 0, 0, 0, 0, 0, 0, -5],
      [0, 0, 0, 5, 5, 0, 0, 0]
    ],
    'queen': [
      [-20, -10, -10, -5, -5, -10, -10, -20],
      [-10, 0, 0, 0, 0, 0, 0, -10],
      [-10, 0, 5, 5, 5, 5, 0, -10],
      [-5, 0, 5, 5, 5, 5, 0, -5],
      [0, 0, 5, 5, 5, 5, 0, -5],
      [-10, 5, 5, 5, 5, 5, 0, -10],
      [-10, 0, 5, 0, 0, 0, 0, -10],
      [-20, -10, -10, -5, -5, -10, -10, -20]
    ],
    'king': [
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-30, -40, -40, -50, -50, -40, -40, -30],
      [-20, -30, -30, -40, -40, -30, -30, -20],
      [-10, -20, -20, -20, -20, -20, -20, -10],
      [20, 20, 0, 0, 0, 0, 20, 20],
      [20, 30, 10, 0, 0, 10, 30, 20]
    ]
  };

  // Add this function to evaluate the position
  const evaluatePosition = (boardState, isWhite) => {
    let score = 0;
    
    // Material evaluation
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = boardState[row][col];
        if (piece) {
          const pieceType = piece.split('_')[1];
          const pieceColor = piece.startsWith('white_');
          const value = PIECE_VALUES[pieceType];
          
          // Add position-based score
          const positionValue = PIECE_POSITION_VALUES[pieceType][pieceColor ? row : 7 - row][col];
          score += (pieceColor === isWhite ? 1 : -1) * (value + positionValue * 0.1);
        }
      }
    }
    
    // Center control bonus
    const centerSquares = [[3, 3], [3, 4], [4, 3], [4, 4]];
    for (const [row, col] of centerSquares) {
      const piece = boardState[row][col];
      if (piece) {
        score += piece.startsWith('white_') === isWhite ? 0.2 : -0.2;
      }
    }
    
    // Mobility bonus
    const mobility = findValidMoves(boardState, isWhite ? 'white' : 'black').length;
    score += mobility * 0.1;
    
    // King safety
    const kingRow = isWhite ? 7 : 0;
    const kingCol = 4;
    if (boardState[kingRow][kingCol] === `${isWhite ? 'white' : 'black'}_king`) {
      score += 0.5; // Bonus for castled king
    }
    
    return score;
  };

  // Add this function to check for tactical opportunities
  const findTacticalOpportunities = (boardState, color) => {
    const opportunities = [];
    const validMoves = findValidMoves(boardState, color);
    
    for (const move of validMoves) {
      // Check for captures
      if (move.captured) {
        const capturingType = move.piece.split('_')[1];
        const capturedType = move.captured.split('_')[1];
        
        // Check if capture is safe
        const tempBoard = boardState.map(r => [...r]);
        tempBoard[move.toRow][move.toCol] = move.piece;
        tempBoard[move.fromRow][move.fromCol] = null;
        
        if (!isSquareAttacked(color === 'white' ? false : true, move.toRow, move.toCol)) {
          opportunities.push({
            type: 'CAPTURE',
            move,
            value: PIECE_VALUES[capturedType] - PIECE_VALUES[capturingType] * 0.1
          });
        }
      }
      
      // Check for checks
      const tempBoard = boardState.map(r => [...r]);
      tempBoard[move.toRow][move.toCol] = move.piece;
      tempBoard[move.fromRow][move.fromCol] = null;
      
      if (isInCheck(color === 'white' ? false : true)) {
        opportunities.push({
          type: 'CHECK',
          move,
          value: 0.5
        });
      }
    }
    
    return opportunities;
  };

  // Add isCheckmate function
  const isCheckmate = (isWhite) => {
    // First check if the king is in check
    if (!isInCheck(isWhite)) return false;

    // Get all valid moves for the current player
    const color = isWhite ? 'white' : 'black';
    const validMoves = findValidMoves(board, color);

    // If there are no valid moves, it's checkmate
    return validMoves.length === 0;
  };

  // Add isInCheck function
  const isInCheck = (isWhite) => {
    // Find the king's position
    let kingRow = -1;
    let kingCol = -1;
    const kingColor = isWhite ? 'white_king' : 'black_king';

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (board[row][col] === kingColor) {
          kingRow = row;
          kingCol = col;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    // Check if any opponent piece can capture the king
    const opponentColor = isWhite ? 'black' : 'white';
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = board[row][col];
        if (piece && piece.startsWith(`${opponentColor}_`)) {
          if (isValidMove(board, row, col, kingRow, kingCol, { enPassantTarget, castlingRights, isKingInCheck, isSquareAttacked })) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Add wouldBeInCheck function
  const wouldBeInCheck = (boardState, isWhite) => {
    // Find the king's position
    let kingRow = -1;
    let kingCol = -1;
    const kingColor = isWhite ? 'white_king' : 'black_king';

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        if (boardState[row][col] === kingColor) {
          kingRow = row;
          kingCol = col;
          break;
        }
      }
      if (kingRow !== -1) break;
    }

    // Check if any opponent piece can capture the king
    const opponentColor = isWhite ? 'black' : 'white';
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = boardState[row][col];
        if (piece && piece.startsWith(`${opponentColor}_`)) {
          if (isValidMove(boardState, row, col, kingRow, kingCol, { enPassantTarget, castlingRights, isKingInCheck, isSquareAttacked })) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Add isSquareAttacked function
  const isSquareAttacked = (isWhite, row, col) => {
    const opponentColor = isWhite ? 'black' : 'white';
    for (let fromRow = 0; fromRow < BOARD_SIZE; fromRow++) {
      for (let fromCol = 0; fromCol < BOARD_SIZE; fromCol++) {
        const piece = board[fromRow][fromCol];
        if (piece && piece.startsWith(`${opponentColor}_`)) {
          if (isValidMove(board, fromRow, fromCol, row, col, { enPassantTarget, castlingRights, isKingInCheck, isSquareAttacked })) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Add function to find all valid moves for a color
  const findValidMoves = (boardState, color) => {
    const moves = [];
    for (let fromRow = 0; fromRow < BOARD_SIZE; fromRow++) {
      for (let fromCol = 0; fromCol < BOARD_SIZE; fromCol++) {
        const piece = boardState[fromRow][fromCol];
        if (piece && piece.startsWith(`${color}_`)) {
          for (let toRow = 0; toRow < BOARD_SIZE; toRow++) {
            for (let toCol = 0; toCol < BOARD_SIZE; toCol++) {
              if (isValidMove(boardState, fromRow, fromCol, toRow, toCol, { enPassantTarget, castlingRights, isKingInCheck, isSquareAttacked })) {
                // Simulate the move
                const tempBoard = boardState.map(row => [...row]);
                tempBoard[toRow][toCol] = piece;
                tempBoard[fromRow][fromCol] = null;
                // Check if king is in check after the move
                const isWhite = color === 'white';
                const kingSafe = !wouldBeInCheck(tempBoard, isWhite);
                if (kingSafe) {
                  moves.push({
                    fromRow,
                    fromCol,
                    toRow,
                    toCol,
                    piece,
                    captured: boardState[toRow][toCol]
                  });
                }
              }
            }
          }
        }
      }
    }
    return moves || []; // Ensure we always return an array
  };

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
          const parsedState = JSON.parse(savedState);
          const { 
            board: savedBoard, 
            currentPlayer: savedPlayer, 
            capturedPieces: savedCaptured, 
            moveHistory: savedMoves,
            enPassantTarget: savedEnPassantTarget, 
            castlingRights: savedCastlingRights 
          } = parsedState || {};

          setBoard(savedBoard || initialBoard);
          setCurrentPlayer(savedPlayer || 'white');
          setCapturedPieces(savedCaptured || { white: [], black: [] });
          setMoveHistory(savedMoves || []);
          setEnPassantTarget(savedEnPassantTarget || null);
          setCastlingRights(savedCastlingRights || {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
          });
        }

        // Load leaderboard with validation
        const savedLeaderboard = await AsyncStorage.getItem('chessLeaderboard');
        if (savedLeaderboard) {
          try {
            const parsedLeaderboard = JSON.parse(savedLeaderboard);
            if (Array.isArray(parsedLeaderboard)) {
              setLeaderboard(parsedLeaderboard);
            } else {
              console.log('Invalid leaderboard data, resetting');
              setLeaderboard([]);
              await AsyncStorage.setItem('chessLeaderboard', JSON.stringify([]));
            }
          } catch (error) {
            console.error('Error parsing leaderboard:', error);
            setLeaderboard([]);
            await AsyncStorage.setItem('chessLeaderboard', JSON.stringify([]));
          }
        }
      } catch (error) {
        console.error('Error loading game state:', error);
        // Set default values if loading fails
        setBoard(initialBoard);
        setCurrentPlayer('white');
        setCapturedPieces({ white: [], black: [] });
        setMoveHistory([]);
        setEnPassantTarget(null);
        setCastlingRights({
          white: { kingSide: true, queenSide: true },
          black: { kingSide: true, queenSide: true }
        });
        setLeaderboard([]);
      }
    };
    loadGameState();
  }, []);

  // Update timer effect to only run if timer is enabled
  useEffect(() => {
    if (isTimerRunning && useTimer && gameMode === 'pvp') {
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
  }, [isTimerRunning, currentPlayer, useTimer, gameMode]);

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

  useEffect(() => {
    if (!gameOver) {
      const whiteCheckmated = isCheckmate(true);
      const blackCheckmated = isCheckmate(false);
      
      if (whiteCheckmated) {
        handleGameOver('black', 'Checkmate');
      } else if (blackCheckmated) {
        handleGameOver('white', 'Checkmate');
      }
    }
  }, [board]);

  // Add these helper functions for move validation
  const isPathClear = (boardState, fromRow, fromCol, toRow, toCol) => {
    if (fromRow === toRow && fromCol === toCol) return true;
    const rowStep = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colStep = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    while (currentRow !== toRow || currentCol !== toCol) {
      if (boardState[currentRow][currentCol]) return false;
      currentRow += rowStep;
      currentCol += colStep;
    }
    return true;
  };

  const isValidPawnMove = (boardState, fromRow, fromCol, toRow, toCol, isWhitePiece, enPassantTarget) => {
    const direction = isWhitePiece ? -1 : 1;
    const startRow = isWhitePiece ? 6 : 1;
    const rowDiff = toRow - fromRow;
    const colDiff = toCol - fromCol;
    const targetPiece = boardState[toRow][toCol];
    // Forward move (no capture)
    if (colDiff === 0) {
      if (rowDiff === direction && !targetPiece) return true;
      if (fromRow === startRow && rowDiff === 2 * direction && !targetPiece && !boardState[fromRow + direction][fromCol]) return true;
      return false;
    }
    // Diagonal capture
    if (Math.abs(colDiff) === 1 && rowDiff === direction) {
      if (targetPiece && targetPiece.startsWith(isWhitePiece ? 'black_' : 'white_')) return true;
      if (enPassantTarget && toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
        const capturedPawnRow = fromRow;
        const capturedPawnCol = toCol;
        const capturedPawn = boardState[capturedPawnRow][capturedPawnCol];
        return capturedPawn && capturedPawn.startsWith(isWhitePiece ? 'black_pawn' : 'white_pawn');
      }
    }
    return false;
  };

  const isValidRookMove = (boardState, fromRow, fromCol, toRow, toCol) => {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    return isPathClear(boardState, fromRow, fromCol, toRow, toCol);
  };

  const isValidKnightMove = (fromRow, fromCol, toRow, toCol) => {
    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  };

  const isValidBishopMove = (boardState, fromRow, fromCol, toRow, toCol) => {
    if (Math.abs(fromRow - toRow) !== Math.abs(fromCol - toCol)) return false;
    return isPathClear(boardState, fromRow, fromCol, toRow, toCol);
  };

  const isValidQueenMove = (boardState, fromRow, fromCol, toRow, toCol) => {
    if (fromRow === toRow || fromCol === toCol || Math.abs(fromRow - toRow) === Math.abs(fromCol - toCol)) {
      return isPathClear(boardState, fromRow, fromCol, toRow, toCol);
    }
    return false;
  };

  const isValidKingMove = (boardState, fromRow, fromCol, toRow, toCol, isWhitePiece, castlingRights, isKingInCheck, isSquareAttacked, skipKingCheck = false) => {
    const rowDiff = Math.abs(fromRow - toRow);
    const colDiff = Math.abs(fromCol - toCol);
    // Normal king move
    if (rowDiff <= 1 && colDiff <= 1) {
      if (!skipKingCheck) {
        const tempBoard = boardState.map(r => [...r]);
        tempBoard[toRow][toCol] = boardState[fromRow][fromCol];
        tempBoard[fromRow][fromCol] = null;
        if (wouldBeInCheck(tempBoard, isWhitePiece)) return false;
      }
      return true;
    }
    // Castling
    if (rowDiff === 0 && colDiff === 2) {
      const side = isWhitePiece ? 'white' : 'black';
      const isKingside = toCol > fromCol;
      if (!castlingRights[side][isKingside ? 'kingSide' : 'queenSide']) return false;
      if (isKingInCheck) return false;
      const pathCols = isKingside ? [5, 6] : [1, 2, 3];
      for (const col of pathCols) {
        if (boardState[fromRow][col]) return false;
      }
      for (const col of [...pathCols, fromCol]) {
        if (isSquareAttacked(boardState, !isWhitePiece, fromRow, col)) return false;
      }
      return true;
    }
    return false;
  };

  const isValidMove = (boardState, fromRow, fromCol, toRow, toCol, options = {}) => {
    const { enPassantTarget, castlingRights, isKingInCheck, isSquareAttacked, skipKingCheck = false } = options;
    const piece = boardState[fromRow][fromCol];
    if (!piece) return false;
    const isWhitePiece = piece.startsWith('white_');
    const pieceType = piece.split('_')[1];
    const targetPiece = boardState[toRow][toCol];
    const isCapture = targetPiece !== null;
    const isTargetWhite = targetPiece && targetPiece.startsWith('white_');
    if (isCapture && isWhitePiece === isTargetWhite) return false;
    if (isCapture && targetPiece.endsWith('_king')) return false;
    if (isKingInCheck && !skipKingCheck) {
      const tempBoard = boardState.map(r => [...r]);
      tempBoard[toRow][toCol] = piece;
      tempBoard[fromRow][fromCol] = null;
      if (wouldBeInCheck(tempBoard, isWhitePiece)) return false;
    }
    switch (pieceType) {
      case 'pawn':
        return isValidPawnMove(boardState, fromRow, fromCol, toRow, toCol, isWhitePiece, enPassantTarget);
      case 'rook':
        return isValidRookMove(boardState, fromRow, fromCol, toRow, toCol);
      case 'knight':
        return isValidKnightMove(fromRow, fromCol, toRow, toCol);
      case 'bishop':
        return isValidBishopMove(boardState, fromRow, fromCol, toRow, toCol);
      case 'queen':
        return isValidQueenMove(boardState, fromRow, fromCol, toRow, toCol);
      case 'king':
        return isValidKingMove(boardState, fromRow, fromCol, toRow, toCol, isWhitePiece, castlingRights, isKingInCheck, isSquareAttacked, skipKingCheck);
      default:
        return false;
    }
  };

  // Update the loadWinTally function to handle session resumption
  const loadWinTally = async () => {
    try {
      console.log('Loading win tally...');
      const savedTally = await AsyncStorage.getItem('chessWinTally');
      const savedNames = await AsyncStorage.getItem('chessPlayerNames');
      const savedLeaderboard = await AsyncStorage.getItem('chessLeaderboard');
      
      console.log('Loaded saved tally:', savedTally);
      console.log('Loaded saved names:', savedNames);
      
      if (savedTally && savedNames) {
        const parsedNames = JSON.parse(savedNames);
        const parsedTally = JSON.parse(savedTally);
        
        // Validate the data
        if (typeof parsedTally === 'object' && 
            typeof parsedTally.white === 'number' && 
            typeof parsedTally.black === 'number') {
          
          // Only load tally if the player names match
          if (parsedNames.white === playerNames.white && parsedNames.black === playerNames.black) {
            console.log('Setting win tally from saved data:', parsedTally);
            setWinTally(parsedTally);
          } else {
            console.log('Player names changed, resetting tally');
            // Reset tally if names don't match
            const resetTally = { white: 0, black: 0 };
            setWinTally(resetTally);
            saveWinTally(resetTally);
          }
        } else {
          console.log('Invalid tally data, resetting');
          const resetTally = { white: 0, black: 0 };
          setWinTally(resetTally);
          saveWinTally(resetTally);
        }
      }

      // Load leaderboard with validation
      if (savedLeaderboard) {
        try {
          const parsedLeaderboard = JSON.parse(savedLeaderboard);
          if (Array.isArray(parsedLeaderboard)) {
            setLeaderboard(parsedLeaderboard);
          } else {
            console.log('Invalid leaderboard data, resetting');
            setLeaderboard([]);
            AsyncStorage.setItem('chessLeaderboard', JSON.stringify([]));
          }
        } catch (error) {
          console.error('Error parsing leaderboard:', error);
          setLeaderboard([]);
          AsyncStorage.setItem('chessLeaderboard', JSON.stringify([]));
        }
      }
    } catch (error) {
      console.error('Error loading win tally and leaderboard:', error);
      // Reset to default values on error
      setWinTally({ white: 0, black: 0 });
      setLeaderboard([]);
    }
  };

  // Update saveWinTally to be more robust
  const saveWinTally = async (newTally) => {
    try {
      // Validate the tally data
      if (typeof newTally !== 'object' || 
          typeof newTally.white !== 'number' || 
          typeof newTally.black !== 'number') {
        console.error('Invalid tally data:', newTally);
        return;
      }

      console.log('Saving win tally:', newTally);
      await AsyncStorage.setItem('chessWinTally', JSON.stringify(newTally));
      await AsyncStorage.setItem('chessPlayerNames', JSON.stringify(playerNames));
      console.log('Win tally saved successfully');
    } catch (error) {
      console.error('Error saving win tally:', error);
    }
  };

  // Add function to save to leaderboard
  const saveToLeaderboard = async (winner, loser, winTypeParam) => {
    try {
      const newEntry = {
        winner: playerNames[winner] || winner.toUpperCase(),
        loser: playerNames[loser] || loser.toUpperCase(),
        date: new Date().toISOString(),
        winType: winTypeParam || winType
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

  // Rematch handler: resets the board but keeps player names and win tally
  const handleRematch = () => {
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
    setIsKingInCheck(false);
    setLastMove(null);
    AsyncStorage.removeItem('chessGameState');
  };

  // Add function to check if a move creates a fork
  const isFork = (move, boardState, color) => {
    const tempBoard = boardState.map(row => [...row]);
    tempBoard[move.toRow][move.toCol] = move.piece;
    tempBoard[move.fromRow][move.fromCol] = null;
    
    let attackCount = 0;
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = tempBoard[row][col];
        if (piece && piece.startsWith(`${color}_`)) {
          for (let toRow = 0; toRow < BOARD_SIZE; toRow++) {
            for (let toCol = 0; toCol < BOARD_SIZE; toCol++) {
              if (isValidMove(tempBoard, row, col, toRow, toCol, { enPassantTarget, castlingRights, isKingInCheck, isSquareAttacked })) {
                const targetPiece = tempBoard[toRow][toCol];
                if (targetPiece && !targetPiece.startsWith(`${color}_`)) {
                  attackCount++;
                  if (attackCount >= 2) return true;
                }
              }
            }
          }
        }
      }
    }
    return false;
  };

  // Update makeComputerMove function to move pieces directly
  const makeComputerMove = () => {
    if (gameMode === 'ai' && !gameOver) {
      const computerColor = playerNames.white === 'Computer' ? 'white' : 'black';
      if (currentPlayer === computerColor) {
        // Get all valid moves
        const validMoves = findValidMoves(board, computerColor);
        
        if (validMoves.length > 0) {
          // Evaluate each move
          const evaluatedMoves = validMoves.map(move => {
            const tempBoard = board.map(row => [...row]);
            tempBoard[move.toRow][move.toCol] = move.piece;
            tempBoard[move.fromRow][move.fromCol] = null;
            
            // Calculate move score
            let score = evaluatePosition(tempBoard, computerColor === 'white');
            
            // Enhanced capture evaluation
            if (move.captured) {
              const capturedType = move.captured.split('_')[1];
              const capturingType = move.piece.split('_')[1];
              const captureValue = PIECE_VALUES[capturedType];
              const capturingValue = PIECE_VALUES[capturingType];
              
              // Higher bonus for capturing higher value pieces
              score += captureValue * 2;
              
              // Penalty for capturing with higher value pieces
              if (capturingValue > captureValue) {
                score -= (capturingValue - captureValue) * 0.5;
              }
              
              // Bonus for safe captures (not immediately recapturable)
              if (!isSquareAttacked(computerColor === 'white' ? false : true, move.toRow, move.toCol)) {
                score += captureValue * 0.5;
              }
            }
            
            // Bonus for checks
            if (isInCheck(computerColor === 'white' ? false : true)) {
              score += 2;
            }
            
            // Bonus for center control
            if ((move.toRow === 3 || move.toRow === 4) && (move.toCol === 3 || move.toCol === 4)) {
              score += 0.5;
            }
            
            // Bonus for forks
            if (isFork(move, tempBoard, computerColor)) {
              score += 3;
            }
            
            // Penalty for moving the same piece multiple times in opening
            if (moveHistory.length < 10) {
              const pieceMoves = moveHistory.filter(m => m.piece === move.piece).length;
              score -= pieceMoves * 0.5;
            }
            
            // Bonus for castling
            if (move.piece.endsWith('_king') && Math.abs(move.fromCol - move.toCol) === 2) {
              score += 2;
            }
            
            return { ...move, score };
          });
          
          // Sort moves by score (highest first)
          evaluatedMoves.sort((a, b) => b.score - a.score);
          
          // Select a move (sometimes pick a random move from top 3 to add variety)
          const topMoves = evaluatedMoves.slice(0, Math.min(3, evaluatedMoves.length));
          const selectedMove = topMoves[Math.floor(Math.random() * topMoves.length)];
          
          // Make the move
          const newBoard = board.map(row => [...row]);
          const piece = board[selectedMove.fromRow][selectedMove.fromCol];
          const isWhitePiece = piece.startsWith('white_');
          const pieceType = piece.split('_')[1];
          const capturedPiece = newBoard[selectedMove.toRow][selectedMove.toCol];

          // Handle capture
          if (capturedPiece) {
            // Remove the captured piece from the board
            newBoard[selectedMove.toRow][selectedMove.toCol] = null;
            // Add to captured pieces list
            setCapturedPieces(prev => ({
              ...prev,
              [isWhitePiece ? 'white' : 'black']: [...prev[isWhitePiece ? 'white' : 'black'], capturedPiece]
            }));
          }

          // Move the piece
          newBoard[selectedMove.toRow][selectedMove.toCol] = piece;
          newBoard[selectedMove.fromRow][selectedMove.fromCol] = null;

          // Handle en passant capture
          if (pieceType === 'pawn' && enPassantTarget && 
              selectedMove.toRow === enPassantTarget.row && selectedMove.toCol === enPassantTarget.col) {
            const capturedPawnRow = selectedMove.fromRow;
            const capturedPawnCol = selectedMove.toCol;
            const capturedPawn = newBoard[capturedPawnRow][capturedPawnCol];
            if (capturedPawn) {
              // Remove the captured piece from the board
              newBoard[capturedPawnRow][capturedPawnCol] = null;
              // Add to captured pieces list
              setCapturedPieces(prev => ({
                ...prev,
                [isWhitePiece ? 'white' : 'black']: [...prev[isWhitePiece ? 'white' : 'black'], capturedPawn]
              }));
            }
          }

          // Handle castling
          if (pieceType === 'king' && Math.abs(selectedMove.fromCol - selectedMove.toCol) === 2) {
            const isKingside = selectedMove.toCol > selectedMove.fromCol;
            const rookCol = isKingside ? 7 : 0;
            const newRookCol = isKingside ? selectedMove.toCol - 1 : selectedMove.toCol + 1;
            newBoard[selectedMove.toRow][newRookCol] = `${isWhitePiece ? 'white' : 'black'}_rook`;
            newBoard[selectedMove.fromRow][rookCol] = null;
            
            setCastlingRights(prev => ({
              ...prev,
              [isWhitePiece ? 'white' : 'black']: {
                kingSide: false,
                queenSide: false
              }
            }));
          }

          // Handle pawn promotion
          if (pieceType === 'pawn' && (selectedMove.toRow === 0 || selectedMove.toRow === 7)) {
            // Always promote to queen for simplicity
            newBoard[selectedMove.toRow][selectedMove.toCol] = `${isWhitePiece ? 'white' : 'black'}_queen`;
          }

          // Update en passant target
          if (pieceType === 'pawn' && Math.abs(selectedMove.fromRow - selectedMove.toRow) === 2) {
            setEnPassantTarget({
              row: (selectedMove.fromRow + selectedMove.toRow) / 2,
              col: selectedMove.toCol
            });
          } else {
            setEnPassantTarget(null);
          }

          // Update castling rights for rook moves
          if (pieceType === 'rook') {
            const side = isWhitePiece ? 'white' : 'black';
            const isKingside = selectedMove.fromCol === 7;
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
            from: [selectedMove.fromRow, selectedMove.fromCol],
            to: [selectedMove.toRow, selectedMove.toCol],
            captured: capturedPiece,
            player: currentPlayer,
            isCastling: pieceType === 'king' && Math.abs(selectedMove.fromCol - selectedMove.toCol) === 2,
            isEnPassant: pieceType === 'pawn' && enPassantTarget && 
                        selectedMove.toRow === enPassantTarget.row && selectedMove.toCol === enPassantTarget.col,
            isPromotion: pieceType === 'pawn' && (selectedMove.toRow === 0 || selectedMove.toRow === 7),
            promotedTo: pieceType === 'pawn' && (selectedMove.toRow === 0 || selectedMove.toRow === 7) ? 'queen' : undefined,
            isCheck: isInCheck(computerColor === 'white' ? false : true),
            isCheckmate: isCheckmate(computerColor === 'white' ? false : true)
          };
          setMoveHistory(prev => [...prev, move]);

          // Update board and switch player
          setBoard(newBoard);
          setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
          
          // Animate the move
          animateMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol);

          // Check for game end conditions after the move
          setTimeout(() => {
            const isNextPlayerCheckmated = isCheckmate(currentPlayer === 'white' ? false : true);

            if (isNextPlayerCheckmated) {
              handleGameOver(computerColor, 'Checkmate');
              
              // Show checkmate alert
              Alert.alert(
                "Checkmate!",
                `${playerNames[computerColor] || computerColor.toUpperCase()} wins by checkmate!`,
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
            } else if (isInCheck(currentPlayer === 'white' ? false : true)) {
              setGameStatus('CHECK!');
              setIsKingInCheck(true);
              Alert.alert(
                "Check!",
                `${playerNames[currentPlayer === 'white' ? 'black' : 'white'] || (currentPlayer === 'white' ? 'BLACK' : 'WHITE')} king is in check!`,
                [{ text: "OK" }]
              );
            } else {
              setGameStatus('');
              setIsKingInCheck(false);
            }
          }, 100);
        }
      }
    }
  };

  // Update effect to trigger computer moves with 5-second delay
  useEffect(() => {
    if (gameMode === 'ai' && !gameOver) {
      const computerColor = playerNames.white === 'Computer' ? 'white' : 'black';
      if (currentPlayer === computerColor) {
        // Add 5-second delay before making the move
        const timer = setTimeout(() => {
          makeComputerMove();
        }, 5000); // 5 seconds delay
        
        return () => {
          clearTimeout(timer);
        };
      }
    }
  }, [currentPlayer, gameMode, gameOver, board]);

  const isPieceBetween = (fromRow, fromCol, toRow, toCol) => {
    const rowStep = fromRow === toRow ? 0 : (toRow - fromRow) / Math.abs(toRow - fromRow);
    const colStep = fromCol === toCol ? 0 : (toCol - fromCol) / Math.abs(toCol - fromCol);
    
    let currentRow = fromRow + rowStep;
    let currentCol = fromCol + colStep;
    
    while (currentRow !== toRow || currentCol !== toCol) {
      if (board[currentRow][currentCol]) return true;
      currentRow += rowStep;
      currentCol += colStep;
    }
    return false;
  };

  const handleDifficultySelection = (difficulty) => {
    setSelectedDifficulty(difficulty);
  };

  const handleGameOver = (winner, winType) => {
    try {
      console.log('Game Over - Winner:', winner, 'Win Type:', winType);
      
      // Set game over state
      setGameOver(true);
      setWinner(winner);
      setGameStatus(winType === 'Checkmate' ? 'CHECKMATE!' : winType);
      setIsKingInCheck(false);
      setShowGameOverModal(true);
      setIsTimerRunning(false);
      setWinType(winType);

      // Only save to leaderboard for Checkmate or Time wins
      if (winType === 'Checkmate' || winType === 'Time') {
        const loser = winner === 'white' ? 'black' : 'white';
        const winnerName = playerNames[winner] || winner.toUpperCase();
        const loserName = playerNames[loser] || loser.toUpperCase();
        
        // Create leaderboard entry
        const leaderboardEntry = {
          winner: winnerName,
          loser: loserName,
          date: new Date().toISOString(),
          winType: winType,
          gameMode: gameMode
        };

        // Update leaderboard
        const updatedLeaderboard = [...leaderboard, leaderboardEntry];
        // Keep only the last 50 games
        if (updatedLeaderboard.length > 50) {
          updatedLeaderboard.shift();
        }
        setLeaderboard(updatedLeaderboard);
        
        // Save to AsyncStorage
        AsyncStorage.setItem('chessLeaderboard', JSON.stringify(updatedLeaderboard))
          .catch(error => console.error('Error saving leaderboard:', error));

        // Show win alert
        Alert.alert(
          "Game Over!",
          `${winnerName} wins against ${loserName} by ${winType}!`,
          [
            { text: "New Game", onPress: () => { setShowTimeSelectionModal(true); resetGame(); }, style: "default" },
            { text: "Exit", onPress: handleExit, style: "cancel" }
          ]
        );
      }
    } catch (error) {
      console.error('Error in handleGameOver:', error);
      Alert.alert(
        "Error",
        "There was an error ending the game. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  // Update the leaderboard rendering to show match results
  const renderLeaderboardEntry = (entry, index) => {
    const winnerName = entry.winner || 'Unknown';
    const loserName = entry.loser || 'Unknown';
    const winType = entry.winType || 'Unknown';
    const gameMode = entry.gameMode || 'pvp';
    const date = new Date(entry.date || Date.now()).toLocaleDateString();
    
    return (
      <View key={index} style={styles.leaderboardEntry}>
        <View style={styles.leaderboardHeader}>
          <Text style={[styles.leaderboardText, styles.chessText, styles.leaderboardWinner]}>
            {winnerName} vs {loserName}
          </Text>
          <Text style={[styles.leaderboardDate, styles.chessText]}>
            {date}
          </Text>
        </View>
        <View style={styles.leaderboardDetails}>
          <Text style={[styles.leaderboardDetail, styles.chessText]}>
            {winnerName} wins by {winType}
          </Text>
          <Text style={[styles.leaderboardDetail, styles.chessText]}>
            Mode: {gameMode.toUpperCase()}
          </Text>
        </View>
      </View>
    );
  };

  const showCheckmateExplanation = () => {
    // Find the last few moves that led to checkmate
    const lastMoves = moveHistory.slice(-5); // Get last 5 moves
    let explanation = "Checkmate Sequence:\n\n";
    
    lastMoves.forEach((move, index) => {
      const moveNumber = moveHistory.length - lastMoves.length + index + 1;
      const pieceType = move.piece.split('_')[1];
      const fromSquare = getSquareNotation(move.from[0], move.from[1]);
      const toSquare = getSquareNotation(move.to[0], move.to[1]);
      
      explanation += `${moveNumber}. ${move.player.toUpperCase()}: ${pieceType.toUpperCase()} ${fromSquare} to ${toSquare}\n`;
      if (move.isCheck) {
        explanation += "   (Check!)\n";
      }
      if (move.isCheckmate) {
        explanation += "   (Checkmate!)\n";
      }
    });

    Alert.alert(
      "Checkmate Sequence",
      explanation,
      [{ text: "OK" }]
    );
  };

  const renderCell = (rowIndex, colIndex) => {
    const isLight = (rowIndex + colIndex) % 2 === 0;
    const piece = board[rowIndex][colIndex];
    const isSelected = selectedPiece && selectedPiece.row === rowIndex && selectedPiece.col === colIndex;
    const isValidMove = validMoves.some(move => move.toRow === rowIndex && move.toCol === colIndex);
    const isLastMove = lastMove && 
      ((lastMove.from[0] === rowIndex && lastMove.from[1] === colIndex) || 
       (lastMove.to[0] === rowIndex && lastMove.to[1] === colIndex));
    const isKingInCheckCell = isKingInCheck && piece && piece.endsWith('_king');

    return (
      <TouchableOpacity
        key={`cell-${rowIndex}-${colIndex}`}
        style={[
          styles.cell,
          isLight ? styles.lightCell : styles.darkCell,
          isSelected && styles.selectedCell,
          isValidMove && styles.validMoveCell,
          isLastMove && styles.lastMoveCell,
          isKingInCheckCell && styles.kingInCheckCell
        ]}
        onPress={() => handleCellPress(rowIndex, colIndex)}
      >
        {/* Cell coordinates */}
        {colIndex === 0 && (
          <Text style={[styles.cellCoordinate, styles.cellNumber]}>
            {8 - rowIndex}
          </Text>
        )}
        {rowIndex === 7 && (
          <Text style={[styles.cellCoordinate, styles.cellLetter]}>
            {String.fromCharCode(97 + colIndex)}
          </Text>
        )}

        {/* Piece */}
        {piece && (
          <View style={styles.pieceContainer}>
            <Text
              style={[
                styles.piece,
                piece.startsWith('white_') ? styles.whitePiece : styles.blackPiece,
                isKingInCheckCell && styles.kingInCheckPiece
              ]}
            >
              {PIECES[piece.split('_')[0]][piece.split('_')[1]]}
            </Text>
          </View>
        )}

        {/* Valid move indicator */}
        {isValidMove && <View style={styles.validMoveIndicator} />}
      </TouchableOpacity>
    );
  };

  // Add handleCellPress function
  const handleCellPress = (row, col) => {
    if (gameOver) {
      Alert.alert(
        "Game Over",
        "The game has ended. Please start a new game or exit.",
        [
          { text: "New Game", onPress: () => { setShowTimeSelectionModal(true); resetGame(); }, style: "default" },
          { text: "Exit", onPress: handleExit, style: "cancel" }
        ]
      );
      return;
    }

    const piece = board[row][col];
    const isWhitePiece = piece && piece.startsWith('white_');
    const isBlackPiece = piece && piece.startsWith('black_');

    // If no piece is selected and the clicked cell has a piece of the current player's color
    if (!selectedPiece && piece && ((currentPlayer === 'white' && isWhitePiece) || (currentPlayer === 'black' && isBlackPiece))) {
      setSelectedPiece({ row, col });
      const moves = findValidMoves(board, currentPlayer);
      
      // Filter moves to only show those for the selected piece
      const validMoves = moves.filter(move => 
        move.fromRow === row && move.fromCol === col
      );
      
      // Filter moves to only show those that get out of check if king is in check
      if (isKingInCheck) {
        const filteredMoves = validMoves.filter(move => {
          const tempBoard = board.map(r => [...r]);
          tempBoard[move.toRow][move.toCol] = piece;
          tempBoard[move.fromRow][move.fromCol] = null;
          return !wouldBeInCheck(tempBoard, currentPlayer === 'white');
        });
        setValidMoves(filteredMoves);
      } else {
        setValidMoves(validMoves);
      }
    }
    // If a piece is already selected
    else if (selectedPiece) {
      const isValidMove = validMoves.some(move => move.toRow === row && move.toCol === col);
      
      if (isValidMove) {
        // Make the move
        const move = validMoves.find(move => move.toRow === row && move.toCol === col);
        const newBoard = board.map(r => [...r]);
        const piece = board[selectedPiece.row][selectedPiece.col];
        const isWhitePiece = piece.startsWith('white_');
        const pieceType = piece.split('_')[1];
        const capturedPiece = newBoard[row][col];

        // Handle capture
        if (capturedPiece) {
          newBoard[row][col] = null;
          setCapturedPieces(prev => ({
            ...prev,
            [isWhitePiece ? 'white' : 'black']: [...prev[isWhitePiece ? 'white' : 'black'], capturedPiece]
          }));
        }

        // Move the piece
        newBoard[row][col] = piece;
        newBoard[selectedPiece.row][selectedPiece.col] = null;

        // Handle en passant capture
        if (pieceType === 'pawn' && enPassantTarget && row === enPassantTarget.row && col === enPassantTarget.col) {
          const capturedPawnRow = selectedPiece.row;
          const capturedPawnCol = col;
          const capturedPawn = newBoard[capturedPawnRow][capturedPawnCol];
          if (capturedPawn) {
            newBoard[capturedPawnRow][capturedPawnCol] = null;
            setCapturedPieces(prev => ({
              ...prev,
              [isWhitePiece ? 'white' : 'black']: [...prev[isWhitePiece ? 'white' : 'black'], capturedPawn]
            }));
          }
        }

        // Handle castling
        if (pieceType === 'king' && Math.abs(selectedPiece.col - col) === 2) {
          const isKingside = col > selectedPiece.col;
          const rookCol = isKingside ? 7 : 0;
          const newRookCol = isKingside ? col - 1 : col + 1;
          newBoard[row][newRookCol] = `${isWhitePiece ? 'white' : 'black'}_rook`;
          newBoard[selectedPiece.row][rookCol] = null;
          
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
          setPromotionMove({ from: [selectedPiece.row, selectedPiece.col], to: [row, col], piece });
          setShowPromotionModal(true);
          return;
        }

        // Update en passant target
        if (pieceType === 'pawn' && Math.abs(selectedPiece.row - row) === 2) {
          setEnPassantTarget({
            row: (selectedPiece.row + row) / 2,
            col: col
          });
        } else {
          setEnPassantTarget(null);
        }

        // Update castling rights for rook moves
        if (pieceType === 'rook') {
          const side = isWhitePiece ? 'white' : 'black';
          const isKingside = selectedPiece.col === 7;
          setCastlingRights(prev => ({
            ...prev,
            [side]: {
              ...prev[side],
              [isKingside ? 'kingSide' : 'queenSide']: false
            }
          }));
        }

        // Record the move
        const moveRecord = {
          piece: piece,
          from: [selectedPiece.row, selectedPiece.col],
          to: [row, col],
          captured: capturedPiece,
          player: currentPlayer,
          isCastling: pieceType === 'king' && Math.abs(selectedPiece.col - col) === 2,
          isEnPassant: pieceType === 'pawn' && enPassantTarget && row === enPassantTarget.row && col === enPassantTarget.col,
          isPromotion: pieceType === 'pawn' && (row === 0 || row === 7),
          promotedTo: pieceType === 'pawn' && (row === 0 || row === 7) ? 'queen' : undefined,
          isCheck: isInCheck(currentPlayer === 'white' ? false : true),
          isCheckmate: isCheckmate(currentPlayer === 'white' ? false : true)
        };
        setMoveHistory(prev => [...prev, moveRecord]);

        // Update board and switch player
        setBoard(newBoard);
        setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
        setLastMove(moveRecord);

        // Check for check or checkmate
        const isNextPlayerCheckmated = isCheckmate(currentPlayer === 'white' ? false : true);
        if (isNextPlayerCheckmated) {
          handleGameOver(currentPlayer, 'Checkmate');
          return; // Stop here if checkmate
        } else if (isInCheck(currentPlayer === 'white' ? false : true)) {
          setGameStatus('CHECK!');
          setIsKingInCheck(true);
        } else {
          setGameStatus('');
          setIsKingInCheck(false);
        }
      }

      // Clear selection
      setSelectedPiece(null);
      setValidMoves([]);
    }
  };

  // Add handlePromotion function
  const handlePromotion = (pieceType) => {
    if (!promotionMove) return;

    const newBoard = board.map(r => [...r]);
    const { from, to, piece } = promotionMove;
    const isWhitePiece = piece.startsWith('white_');
    
    // Replace pawn with selected piece
    newBoard[to[0]][to[1]] = `${isWhitePiece ? 'white' : 'black'}_${pieceType}`;
    
    // Update board and switch player
    setBoard(newBoard);
    setCurrentPlayer(currentPlayer === 'white' ? 'black' : 'white');
    
    // Record the move
    const moveRecord = {
      piece: piece,
      from: from,
      to: to,
      player: currentPlayer,
      isPromotion: true,
      promotedTo: pieceType,
      isCheck: isInCheck(currentPlayer === 'white' ? false : true),
      isCheckmate: isCheckmate(currentPlayer === 'white' ? false : true)
    };
    setMoveHistory(prev => [...prev, moveRecord]);
    setLastMove(moveRecord);
    
    // Clear promotion state
    setPromotionMove(null);
    setShowPromotionModal(false);
    
    // Check for check or checkmate
    const isNextPlayerCheckmated = isCheckmate(currentPlayer === 'white' ? false : true);
    if (isNextPlayerCheckmated) {
      handleGameOver(currentPlayer, 'Checkmate');
    } else if (isInCheck(currentPlayer === 'white' ? false : true)) {
      setGameStatus('CHECK!');
      setIsKingInCheck(true);
    } else {
      setGameStatus('');
      setIsKingInCheck(false);
    }
  };

  // Add handleTimeUp function
  const handleTimeUp = (color) => {
    const winner = color === 'white' ? 'black' : 'white';
    setTimeUpWinner(winner);
    setShowTimeUpModal(true);
    handleGameOver(winner, 'Time');
  };

  // Add animateMove function
  const animateMove = (fromRow, fromCol, toRow, toCol) => {
    // Create a temporary animated piece
    const piece = board[fromRow][fromCol];
    if (!piece) return;

    // Calculate the position of the piece
    const cellSize = Dimensions.get('window').width / 8;
    const fromX = fromCol * cellSize;
    const fromY = fromRow * cellSize;
    const toX = toCol * cellSize;
    const toY = toRow * cellSize;

    // Animate the piece
    Animated.sequence([
      Animated.timing(captureAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(captureAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar style="light" />
        <Animated.View style={[styles.loadingContent, { opacity: fadeAnim }]}>
          <Text style={styles.loadingText}>Loading Chess Game</Text>
          <View style={styles.loadingDots}>
            <Animated.Text style={[styles.loadingDot, { opacity: pulseAnim }]}>.</Animated.Text>
            <Animated.Text style={[styles.loadingDot, { opacity: pulseAnim }]}>.</Animated.Text>
            <Animated.Text style={[styles.loadingDot, { opacity: pulseAnim }]}>.</Animated.Text>
          </View>
        </Animated.View>
      </View>
    );
  }

  if (showStartScreen) {
    return (
      <View style={[styles.container, styles.startContainer]}>
        <StatusBar style="dark" />
        <ScrollView
          style={{ flex: 1, width: '100%' }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 90 }}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View 
            style={[
              styles.startContent,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.gameTitleContainer}>
              <Text style={styles.gameTitle}>Chess Game</Text>
              <Text style={styles.gameSubtitle}>Challenge Your Mind</Text>
            </View>

            {/* Game Mode Selection */}
            <View style={styles.gameModeContainer}>
              <Text style={styles.sectionTitle}>Select Game Mode</Text>
              <View style={styles.gameModeButtons}>
                <TouchableOpacity
                  style={[
                    styles.gameModeButton,
                    gameMode === 'pvp' && styles.selectedGameModeButton
                  ]}
                  onPress={() => setGameMode('pvp')}
                >
                  <View style={styles.gameModeIconContainer}>
                    <Text style={styles.gameModeIcon}>👥</Text>
                  </View>
                  <Text style={styles.gameModeText}>Player vs Player</Text>
                  <Text style={styles.gameModeDescription}>Play against a friend</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gameModeButton,
                    gameMode === 'ai' && styles.selectedGameModeButton
                  ]}
                  onPress={() => setGameMode('ai')}
                >
                  <View style={styles.gameModeIconContainer}>
                    <Text style={styles.gameModeIcon}>🤖</Text>
                  </View>
                  <Text style={styles.gameModeText}>Player vs Computer</Text>
                  <Text style={styles.gameModeDescription}>Challenge the AI</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Add this inside the gameModeContainer, after the gameModeButtons */}
            {gameMode === 'ai' && (
              <View style={styles.difficultyContainer}>
                <Text style={styles.setupSubtitle}>Select Difficulty</Text>
                <View style={styles.difficultyButtons}>
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.difficultyButton,
                        selectedDifficulty === option.value && styles.selectedDifficultyButton
                      ]}
                      onPress={() => handleDifficultySelection(option.value)}
                    >
                      <Text style={styles.difficultyButtonText}>{option.label}</Text>
                      <Text style={styles.difficultyDescription}>{option.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Enhanced Player Setup */}
            <View style={styles.playerSetupContainer}>
              <Text style={styles.sectionTitle}>Game Setup</Text>
              
              {/* Color Selection */}
              <View style={styles.setupSection}>
                <Text style={styles.setupSubtitle}>Choose Your Color</Text>
                <View style={styles.colorSelectionContainer}>
                  <TouchableOpacity
                    style={[
                      styles.colorButton,
                      selectedColor === 'white' && styles.selectedColorButton
                    ]}
                    onPress={() => handleColorSelection('white')}
                  >
                    <View style={styles.colorButtonContent}>
                      <Text style={styles.colorButtonIcon}>⚪</Text>
                      <Text style={styles.colorButtonText}>White</Text>
                      <Text style={styles.colorButtonSubtext}>First Move</Text>
                    </View>
                    {selectedColor === 'white' && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.colorButton,
                      selectedColor === 'black' && styles.selectedColorButton
                    ]}
                    onPress={() => handleColorSelection('black')}
                  >
                    <View style={styles.colorButtonContent}>
                      <Text style={styles.colorButtonIcon}>⚫</Text>
                      <Text style={styles.colorButtonText}>Black</Text>
                      <Text style={styles.colorButtonSubtext}>Second Move</Text>
                    </View>
                    {selectedColor === 'black' && (
                      <View style={styles.selectedIndicator} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Name Input */}
              <View style={styles.setupSection}>
                <Text style={styles.setupSubtitle}>Enter Player Name</Text>
                <View style={styles.nameInputWrapper}>
                  <TextInput
                    style={[
                      styles.nameInput,
                      selectedColor && styles.activeNameInput
                    ]}
                    placeholder="Enter your name"
                    placeholderTextColor="#bdc3c7"
                    value={playerNames[selectedColor]}
                    onChangeText={(text) => handleNameChange(selectedColor, text)}
                    editable={!!selectedColor}
                  />
                  <View style={styles.nameInputIcon}>👤</View>
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>
        <View style={styles.fixedStartButtonWrapper}>
          <TouchableOpacity
            style={[
              styles.startButton,
              ((gameMode === 'pvp' && (!selectedColor || !playerNames[selectedColor])) || 
                (gameMode === 'ai' && !playerNames[selectedColor])) && styles.disabledButton
            ]}
            onPress={handleStartGame}
            disabled={gameMode === 'pvp' ? (!selectedColor || !playerNames[selectedColor]) : !playerNames[selectedColor]}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const renderRulesModal = () => (
    <Modal
      visible={showRulesModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowRulesModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, styles.rulesModal]}>
          <ScrollView style={styles.rulesScrollView}>
            <Text style={[styles.modalTitle, styles.chessText]}>Chess Rules</Text>
            
            {/* Add Winning Conditions Section */}
            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>Winning the Game</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                There are two ways to win a chess game:{'\n\n'}
                1. Checkmate:{'\n'}
                • Occurs when a player's king is in check (under attack){'\n'}
                • No legal moves are available to get out of check{'\n'}
                • The game ends immediately{'\n'}
                • The player who delivered the checkmate wins{'\n\n'}
                2. Time:{'\n'}
                • Each player has a limited amount of time{'\n'}
                • Time is set at the start of the game{'\n'}
                • If a player runs out of time, they lose{'\n'}
                • The other player wins by time{'\n\n'}
                Note: The game can also end in a draw by stalemate, insufficient material, or by agreement.
              </Text>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>Pawn</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                • Moves forward one square{'\n'}
                • On first move, can move forward one or two squares{'\n'}
                • Captures diagonally one square{'\n'}
                • Can perform en passant capture{'\n'}
                • Promotes to any piece when reaching opposite end
              </Text>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>Rook</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                • Moves any number of squares horizontally or vertically{'\n'}
                • Cannot jump over other pieces{'\n'}
                • Participates in castling with the king
              </Text>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>Knight</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                • Moves in an L-shape: 2 squares in one direction, then 1 square perpendicular{'\n'}
                • Can jump over other pieces{'\n'}
                • Only piece that can move over other pieces
              </Text>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>Bishop</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                • Moves any number of squares diagonally{'\n'}
                • Cannot jump over other pieces{'\n'}
                • Stays on the same color squares
              </Text>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>Queen</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                • Moves any number of squares horizontally, vertically, or diagonally{'\n'}
                • Most powerful piece{'\n'}
                • Cannot jump over other pieces
              </Text>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>King</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                • Moves one square in any direction{'\n'}
                • Can perform castling with a rook{'\n'}
                • Cannot move into check{'\n'}
                • Game ends if checkmate occurs
              </Text>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>Special Moves</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                • Castling: King moves two squares toward rook, rook jumps over{'\n'}
                • En Passant: Pawn captures opponent's pawn that just moved two squares{'\n'}
                • Promotion: Pawn becomes any piece upon reaching opposite end
              </Text>
            </View>

            <View style={styles.rulesSection}>
              <Text style={[styles.rulesSectionTitle, styles.chessText]}>Game Rules</Text>
              <Text style={[styles.rulesText, styles.chessText]}>
                • White moves first{'\n'}
                • Players take turns moving one piece at a time{'\n'}
                • Capture opponent's pieces by moving onto their square{'\n'}
                • Check: King is under attack{'\n'}
                • Checkmate: King is in check with no legal moves{'\n'}
                • Stalemate: No legal moves but king is not in check
              </Text>
            </View>
          </ScrollView>
          
          <TouchableOpacity
            style={[styles.modalButton, styles.chessButton]}
            onPress={() => setShowRulesModal(false)}
          >
            <Text style={styles.modalButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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
            style={styles.rulesButton}
            onPress={() => setShowRulesModal(true)}
          >
            <Text style={styles.rulesButtonText}>📖</Text>
          </TouchableOpacity>
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

      {/* Only show timer in player vs player mode */}
      {gameMode === 'pvp' && useTimer && (
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
      )}

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
              gameStatus === 'CHECKMATE!' ? styles.checkmateStatus : styles.checkStatus,
              {
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: [{ translateX: -100 }, { translateY: -25 }],
                zIndex: 1000,
                padding: 20,
                borderRadius: 15,
                elevation: 5,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
              }
            ]}>
              <Text style={[styles.gameStatusText, { 
                fontSize: 28,
                fontWeight: 'bold',
                textAlign: 'center',
                color: '#fff',
                textShadowColor: 'rgba(0, 0, 0, 0.75)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 4
              }]}>
                {gameStatus}
              </Text>
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
              key={`move-${index}`}
              style={[styles.moveHistoryText, styles.chessText]}
            >
              {index + 1}. {move.player || ''}: {getMoveNotation(move)}
            </Text>
          ))}
        </ScrollView>
      </View>

      <Modal
        visible={showGameOverModal || gameStatus === 'CHECKMATE!'}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {}}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#232526',
            borderRadius: 30,
            padding: 30,
            width: '85%',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 10,
          }}>
            {/* Trophy Icon */}
            <Text style={{ fontSize: 60, marginBottom: 10 }}>🏆</Text>
            {/* Winner Message */}
            <Text style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: '#fff',
              marginBottom: 10,
              textAlign: 'center',
              textShadowColor: '#000',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 8,
            }}>
              Game Over
            </Text>
            <Text style={{
              fontSize: 28,
              color: '#ffe066',
              marginBottom: 20,
              textAlign: 'center',
              fontWeight: 'bold',
              textShadowColor: '#000',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 4,
            }}>
              {winner ? `${playerNames[winner] || winner.toUpperCase()} wins by ${winType || 'Checkmate'}!` : winType === 'Stalemate' ? 'Draw by Stalemate!' : 'Game ended'}
            </Text>
            {/* Show win type */}
            {winType && (
              <Text style={{
                fontSize: 20,
                color: '#fff',
                marginBottom: 10,
                textAlign: 'center',
                fontStyle: 'italic',
                opacity: 0.8,
              }}>
                Win Type: {winType}
              </Text>
            )}
            {/* Buttons */}
            <View style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'stretch',
              gap: 15,
              marginTop: 20,
              width: '100%',
            }}>
              {winType === 'Checkmate' && (
                <TouchableOpacity
                  style={{
                    backgroundColor: '#9b59b6',
                    paddingVertical: 15,
                    borderRadius: 15,
                    width: '100%',
                    marginBottom: 10,
                    shadowColor: '#9b59b6',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 4,
                    alignItems: 'center',
                  }}
                  activeOpacity={0.85}
                  onPress={showCheckmateExplanation}
                >
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>View Checkmate Sequence</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{
                  backgroundColor: '#27ae60',
                  paddingVertical: 15,
                  borderRadius: 15,
                  width: '100%',
                  marginBottom: 10,
                  shadowColor: '#27ae60',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                  alignItems: 'center',
                }}
                activeOpacity={0.85}
                onPress={() => {
                  setShowTimeSelectionModal(true); // Show time selection modal for new game
                  resetGame();
                }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>New Game</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#e67e22',
                  paddingVertical: 15,
                  borderRadius: 15,
                  width: '100%',
                  marginBottom: 10,
                  shadowColor: '#e67e22',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                  alignItems: 'center',
                }}
                activeOpacity={0.85}
                onPress={handleRematch}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Rematch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#e74c3c',
                  paddingVertical: 15,
                  borderRadius: 15,
                  width: '100%',
                  shadowColor: '#e74c3c',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                  alignItems: 'center',
                }}
                activeOpacity={0.85}
                onPress={handleExit}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Exit</Text>
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
        <View style={styles.enhancedModalOverlay}>
          <View style={styles.enhancedPauseModalContent}>
            <Text style={styles.enhancedModalTitle}>Game Paused</Text>
            <View style={styles.enhancedPauseMenuButtons}>
              <TouchableOpacity
                style={[styles.enhancedPauseMenuButton, styles.resumeButton]}
                onPress={handleResume}
              >
                <Text style={styles.enhancedModalButtonText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.enhancedPauseMenuButton, styles.restartButton]}
                onPress={resetGame}
              >
                <Text style={styles.enhancedModalButtonText}>Restart</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.enhancedPauseMenuButton, styles.exitButton]}
                onPress={handleExit}
              >
                <Text style={styles.enhancedModalButtonText}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
              {leaderboard.map((entry, index) => renderLeaderboardEntry(entry, index))}
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

      <Modal
        visible={showTimeUpModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTimeUpModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.95)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            backgroundColor: '#232526',
            borderRadius: 30,
            padding: 30,
            width: '85%',
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 16,
            elevation: 10,
          }}>
            {/* Timer Icon */}
            <Text style={{ fontSize: 60, marginBottom: 10 }}>⏰</Text>
            {/* Winner Message */}
            <Text style={{
              fontSize: 36,
              fontWeight: 'bold',
              color: '#fff',
              marginBottom: 10,
              textAlign: 'center',
              textShadowColor: '#000',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 8,
            }}>
              Time's Up!
            </Text>
            <Text style={{
              fontSize: 28,
              color: '#ffe066',
              marginBottom: 20,
              textAlign: 'center',
              fontWeight: 'bold',
              textShadowColor: '#000',
              textShadowOffset: { width: 1, height: 1 },
              textShadowRadius: 4,
            }}>
              {timeUpWinner ? `${playerNames[timeUpWinner] || timeUpWinner.toUpperCase()} wins by time!` : ''}
            </Text>
            {/* Show current score */}
            <Text style={{
              fontSize: 20,
              color: '#fff',
              marginBottom: 10,
              textAlign: 'center',
              fontStyle: 'italic',
              opacity: 0.8,
            }}>
              Current Score:
              {`\n${playerNames.white || 'White'}: ${winTally.white || 0} wins`}
              {`\n${playerNames.black || 'Black'}: ${winTally.black || 0} wins`}
            </Text>
            {/* Buttons */}
            <View style={{
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'stretch',
              gap: 15,
              marginTop: 20,
              width: '100%',
            }}>
              <TouchableOpacity
                style={{
                  backgroundColor: '#27ae60',
                  paddingVertical: 15,
                  borderRadius: 15,
                  width: '100%',
                  marginBottom: 10,
                  shadowColor: '#27ae60',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                  alignItems: 'center',
                }}
                activeOpacity={0.85}
                onPress={() => { setShowTimeUpModal(false); setShowTimeSelectionModal(true); resetGame(); }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>New Game</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#e67e22',
                  paddingVertical: 15,
                  borderRadius: 15,
                  width: '100%',
                  marginBottom: 10,
                  shadowColor: '#e67e22',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                  alignItems: 'center',
                }}
                activeOpacity={0.85}
                onPress={() => { setShowTimeUpModal(false); handleRematch(); }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Rematch</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{
                  backgroundColor: '#e74c3c',
                  paddingVertical: 15,
                  borderRadius: 15,
                  width: '100%',
                  shadowColor: '#e74c3c',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 4,
                  alignItems: 'center',
                }}
                activeOpacity={0.85}
                onPress={() => { setShowTimeUpModal(false); handleExit(); }}
              >
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>Exit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {renderRulesModal()}
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 30,
    paddingHorizontal: 10,
    backgroundColor: '#f5f5f5',
    position: 'relative', // Ensure relative positioning for absolute children
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    zIndex: 2,
  },
  cellNumber: {
    left: 2,
    top: 2,
  },
  cellLetter: {
    right: 2,
    bottom: 2,
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
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  loadingDots: {
    flexDirection: 'row',
  },
  loadingDot: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  startContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 20,
    position: 'relative', // Ensure relative positioning for absolute children
  },
  startContent: {
    alignItems: 'center',
    padding: 15,
    width: '100%',
    maxWidth: 500,
    flex: 1,
    justifyContent: 'space-between',
  },
  gameTitleContainer: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  gameTitle: {
    color: '#222',
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 5,
    textAlign: 'center',
  },
  gameSubtitle: {
    color: '#555',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#34495e',
    borderRadius: 10,
    marginTop: 10,
  },
  tallySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tallyLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tallyValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tallyValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  tallyWinsText: {
    fontSize: 14,
    color: '#bdc3c7',
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
    marginVertical: 10,
  },
  leaderboardEntry: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#34495e',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  leaderboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leaderboardText: {
    fontSize: 16,
    marginBottom: 5,
  },
  leaderboardWinner: {
    fontWeight: 'bold',
    color: '#2ecc71',
  },
  leaderboardDate: {
    fontSize: 12,
    color: '#bdc3c7',
  },
  leaderboardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  leaderboardDetail: {
    fontSize: 14,
    color: '#ecf0f1',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  gameModeContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#222',
  },
  gameModeButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  gameModeButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 18,
    width: '45%',
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#bbb',
  },
  selectedGameModeButton: {
    borderColor: '#1976d2',
    backgroundColor: '#e3f0fc',
  },
  buttonGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    opacity: 0,
    borderRadius: 15,
  },
  gameModeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gameModeIcon: {
    fontSize: 30,
  },
  gameModeText: {
    color: '#222',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  gameModeDescription: {
    color: '#555',
    fontSize: 13,
    textAlign: 'center',
  },
  startButton: {
    backgroundColor: '#1976d2',
    borderRadius: 10,
    padding: 18,
    width: '80%',
    alignItems: 'center',
    marginTop: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  startButtonIcon: {
    fontSize: 24,
  },
  disabledButton: {
    backgroundColor: '#bbb',
    borderColor: '#bbb',
    opacity: 0.7,
  },
  setupSection: {
    marginBottom: 20,
  },
  setupSubtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  setupStatusContainer: {
    marginBottom: 10,
  },
  setupStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  nameInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nameInputWrapper: {
    flex: 1,
    marginRight: 10,
  },
  nameInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 5,
    color: '#222',
    borderWidth: 1,
    borderColor: '#bbb',
  },
  activeNameInput: {
    borderColor: '#1976d2',
  },
  nameInputIcon: {
    fontSize: 24,
    color: '#bdc3c7',
    marginLeft: 10,
  },
  colorSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  colorButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    width: '48%',
    alignItems: 'center',
    marginVertical: 5,
    borderWidth: 1,
    borderColor: '#bbb',
  },
  selectedColorButton: {
    borderColor: '#1976d2',
    backgroundColor: '#e3f0fc',
  },
  colorButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorButtonIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  colorButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
  },
  colorButtonSubtext: {
    fontSize: 12,
    color: '#555',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
    borderRadius: 10,
  },
  difficultyContainer: {
    marginTop: 20,
    width: '100%',
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  difficultyButton: {
    flex: 1,
    backgroundColor: '#34495e',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3498db',
  },
  selectedDifficultyButton: {
    backgroundColor: '#2980b9',
    borderColor: '#2ecc71',
  },
  difficultyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  difficultyDescription: {
    color: '#bdc3c7',
    fontSize: 12,
    textAlign: 'center',
  },
  fixedStartButtonWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    zIndex: 100,
    alignItems: 'center',
  },
  pauseButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#3498db',
    marginLeft: 10,
  },
  pauseButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  enhancedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enhancedPauseModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 10,
  },
  enhancedModalTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 28,
    textAlign: 'center',
  },
  enhancedPauseMenuButtons: {
    width: '100%',
    gap: 16,
  },
  enhancedPauseMenuButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  resumeButton: {
    backgroundColor: '#1976d2',
  },
  restartButton: {
    backgroundColor: '#43a047',
  },
  exitButton: {
    backgroundColor: '#e53935',
  },
  enhancedModalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  timerToggleContainer: {
    marginBottom: 20,
  },
  timerToggleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  timerToggleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  timerToggleButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#34495e',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedTimerToggle: {
    backgroundColor: '#2ecc71',
  },
  timerToggleText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  timeSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10
  },
  rulesModal: {
    backgroundColor: '#34495e',
    padding: 20,
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  rulesScrollView: {
    width: '100%',
  },
  rulesSection: {
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 15,
    borderRadius: 10,
  },
  rulesSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2ecc71',
  },
  rulesText: {
    fontSize: 16,
    lineHeight: 24,
  },
  rulesButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#3498db',
    marginRight: 10,
  },
  rulesButtonText: {
    fontSize: 24,
  },
  tacticalMoveCell: {
    backgroundColor: 'rgba(255, 215, 0, 0.4)',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  
  insightContainer: {
    backgroundColor: 'rgba(52, 73, 94, 0.9)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  
  insightText: {
    color: '#ecf0f1',
    fontSize: 14,
    marginBottom: 5,
  },
});