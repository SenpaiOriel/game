import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, Animated, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
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

export default function PvCGame() {
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
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [showTimeSelectionModal, setShowTimeSelectionModal] = useState(true);
  const [selectedTime, setSelectedTime] = useState(5);
  const [useTimer, setUseTimer] = useState(true);
  const timerRef = useRef(null);
  const [lastMove, setLastMove] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [playerNames, setPlayerNames] = useState({ white: '', black: 'Computer' });
  const [gameStatus, setGameStatus] = useState('');
  const [isKingInCheck, setIsKingInCheck] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [winTally, setWinTally] = useState({ white: 0, black: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboardModal, setShowLeaderboardModal] = useState(false);
  const [winType, setWinType] = useState('');
  const [captureAnim] = useState(new Animated.Value(1));
  const [difficulty, setDifficulty] = useState('medium');
  const [showDifficultyModal, setShowDifficultyModal] = useState(true);

  // Add your existing game logic functions here (isValidMove, handleCellPress, etc.)
  // Copy the relevant functions from the original file

  const handleExit = () => {
    router.replace('/');
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

  const handleDifficultySelection = (level) => {
    setDifficulty(level);
    setShowDifficultyModal(false);
  };

  return (
    <View style={[styles.container, styles.chessTheme]}>
      <StatusBar style="light" />
      <View style={styles.headerContainer}>
        <Text style={[styles.header, styles.chessText]}>
          {currentPlayer === 'white' 
            ? `${playerNames.white || 'White'}'s turn`
            : `${playerNames.black}'s turn`}
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
            onPress={() => setShowTimeSelectionModal(true)}
          >
            <Text style={styles.pauseButtonText}>⏸</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add your existing game board and UI components here */}
      {/* Copy the relevant JSX from the original file */}

      {/* Difficulty Selection Modal */}
      <Modal
        visible={showDifficultyModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.chessModal]}>
            <Text style={[styles.modalTitle, styles.chessText]}>
              Select Difficulty
            </Text>
            {['Easy', 'Medium', 'Hard'].map((difficulty) => (
              <TouchableOpacity
                key={difficulty}
                style={[
                  styles.difficultyButton,
                  selectedDifficulty === difficulty && styles.selectedDifficultyButton
                ]}
                onPress={() => handleDifficultySelection(difficulty)}
              >
                <Text style={[styles.difficultyButtonText, styles.chessText]}>
                  {difficulty}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Time Selection Modal */}
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
                {[3, 5, 7, 10].map((minutes) => (
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

      {/* Game Over Modal */}
      <Modal
        visible={showGameOverModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.chessModal]}>
            <Text style={[styles.modalTitle, styles.chessText]}>
              Game Over
            </Text>
            <Text style={[styles.modalText, styles.chessText]}>
              {winner ? `${playerNames[winner] || winner.toUpperCase()} wins!` : 'Game ended in a draw'}
            </Text>
            <View style={styles.modalButtonsContainer}>
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

      {/* Leaderboard Modal */}
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
  // Copy the relevant styles from the original file
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
  pauseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#e67e22',
  },
  pauseButtonText: {
    fontSize: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
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
  difficultyButton: {
    backgroundColor: '#34495e',
    padding: 15,
    borderRadius: 10,
    marginVertical: 5,
    width: '100%',
    alignItems: 'center',
  },
  selectedDifficultyButton: {
    backgroundColor: '#2ecc71',
  },
  difficultyButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
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
  timeSelectionContainer: {
    width: '100%',
    padding: 10,
  },
  timeSelectionTitle: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'center',
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
}); 