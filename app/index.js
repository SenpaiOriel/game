import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, Button, StyleSheet, TouchableOpacity, Alert, FlatList, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import Matter from 'matter-js';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

const BALL_SIZE = 40;
const OBSTACLE_WIDTH = 60;
const GAP_SIZE = 200;
const GRAVITY = 0.5;
const MIN_GAP_HEIGHT = 100;
const OBSTACLE_SPEED = 3;

const DIFFICULTY_LEVELS = {
  easy: {
    gapSize: 250,
    obstacleSpeed: 2,
    obstacleSpacing: 120,
    gravity: 0.4
  },
  medium: {
    gapSize: 200,
    obstacleSpeed: 3,
    obstacleSpacing: 100,
    gravity: 0.5
  },
  hard: {
    gapSize: 150,
    obstacleSpeed: 4,
    obstacleSpacing: 80,
    gravity: 0.6
  }
};

export default function App() {
  const [playerName, setPlayerName] = useState('');
  const [enteredName, setEnteredName] = useState(false);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(false);
  const [leaderboard, setLeaderboard] = useState({
    easy: [],
    medium: [],
    hard: []
  });
  const [gameEngine, setGameEngine] = useState(null);
  const [isDay, setIsDay] = useState(true);
  const [showPlayButton, setShowPlayButton] = useState(true);
  const [lastScore, setLastScore] = useState(0);
  const ballY = useRef(300);
  const velocity = useRef(0);
  const obstacles = useRef([]);
  const [tick, setTick] = useState(0);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [difficulty, setDifficulty] = useState('medium');
  const [showDifficulty, setShowDifficulty] = useState(false);
  const [showNameAlert, setShowNameAlert] = useState(false);

  useEffect(() => {
    if (running) {
      const interval = setInterval(() => {
        setTick(prev => prev + 1);
        // Toggle day/night every 100 ticks
        if (tick % 100 === 0) {
          setIsDay(prev => !prev);
        }
      }, 20);
      return () => clearInterval(interval);
    }
  }, [running, tick]);

  useEffect(() => {
    if (running) {
      velocity.current += DIFFICULTY_LEVELS[difficulty].gravity;
      ballY.current += velocity.current;

      // Check collision
      for (let i = 0; i < obstacles.current.length; i++) {
        const obs = obstacles.current[i];
        if (
          obs.x < 100 + BALL_SIZE / 2 &&
          obs.x + OBSTACLE_WIDTH > 100 - BALL_SIZE / 2
        ) {
          if (ballY.current < obs.topHeight || ballY.current > obs.topHeight + GAP_SIZE) {
            endGame();
            return;
          }
          // Check if we've passed the obstacle
          if (!obs.passed && obs.x + OBSTACLE_WIDTH < 100 - BALL_SIZE / 2) {
            obs.passed = true;
            setScore(prev => prev + 1);
          }
        }
      }

      // Hit ground or sky
      if (ballY.current > 600 || ballY.current < 0) {
        endGame();
        return;
      }

      // Move obstacles and check for passing
      obstacles.current = obstacles.current.map(obs => {
        const newX = obs.x - DIFFICULTY_LEVELS[difficulty].obstacleSpeed;
        // Check if we've passed the obstacle
        if (!obs.passed && newX + OBSTACLE_WIDTH < 100 - BALL_SIZE / 2) {
          obs.passed = true;
          setScore(prev => prev + 1);
        }
        return { ...obs, x: newX };
      });

      // Add new obstacle with proper spacing based on difficulty
      if (tick % DIFFICULTY_LEVELS[difficulty].obstacleSpacing === 0) {
        const maxTopHeight = 600 - DIFFICULTY_LEVELS[difficulty].gapSize - MIN_GAP_HEIGHT;
        const topHeight = Math.floor(Math.random() * (maxTopHeight - MIN_GAP_HEIGHT)) + MIN_GAP_HEIGHT;
        
        obstacles.current.push({ 
          x: 400, 
          topHeight,
          passed: false 
        });
      }

      // Remove off-screen obstacles
      obstacles.current = obstacles.current.filter(obs => obs.x + OBSTACLE_WIDTH > 0);
    }
  }, [tick, difficulty]);

  const handleJump = () => {
    if (!running) return;
    velocity.current = -8;
  };

  const startGame = () => {
    ballY.current = 300;
    velocity.current = 0;
    obstacles.current = [];
    setScore(0);
    setRunning(true);
    setShowPlayButton(false);
    setShowGameOverModal(false);
  };

  const endGame = () => {
    setRunning(false);
    setLastScore(score);
    const newEntry = { name: playerName, score, date: new Date().toLocaleDateString() };
    
    setLeaderboard(prev => {
      const updatedLeaderboard = { ...prev };
      const currentDifficultyLeaderboard = [...prev[difficulty]];
      
      // Check if player already exists
      const existingPlayerIndex = currentDifficultyLeaderboard.findIndex(entry => entry.name === playerName);
      
      if (existingPlayerIndex !== -1) {
        // Update the score if it's higher
        if (score > currentDifficultyLeaderboard[existingPlayerIndex].score) {
          currentDifficultyLeaderboard[existingPlayerIndex] = {
            ...currentDifficultyLeaderboard[existingPlayerIndex],
            score: score,
            date: new Date().toLocaleDateString()
          };
        }
      } else {
        // Add new player if they don't exist
        currentDifficultyLeaderboard.push(newEntry);
      }
      
      // Sort and limit to top 10
      updatedLeaderboard[difficulty] = currentDifficultyLeaderboard
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);
      
      return updatedLeaderboard;
    });
    
    setShowGameOverModal(true);
  };

  const goToHome = () => {
    setShowGameOverModal(false);
    setEnteredName(false);
  };

  const selectDifficulty = (level) => {
    setDifficulty(level);
    setShowDifficulty(false);
    startGame();
  };

  if (!enteredName) {
    return (
      <KeyboardAvoidingView 
        style={[styles.centered, isDay ? styles.dayTheme : styles.nightTheme]} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inputContainer}>
          <Text style={[styles.title, isDay ? styles.dayText : styles.nightText]}>Welcome to FlappyBall!</Text>
          <TextInput
            placeholder="Enter your name"
            value={playerName}
            onChangeText={setPlayerName}
            style={[
              styles.input,
              {
                backgroundColor: isDay ? '#fff' : '#333',
                color: isDay ? '#000' : '#fff',
              }
            ]}
            placeholderTextColor={isDay ? '#666' : '#999'}
          />
          <TouchableOpacity 
            style={[styles.startButton, isDay ? styles.dayButton : styles.nightButton]}
            onPress={() => {
              if (playerName.trim()) {
                setEnteredName(true);
                setShowDifficulty(true);
              } else {
                setShowNameAlert(true);
              }
            }}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showNameAlert}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.alertModal, isDay ? styles.dayModal : styles.nightModal]}>
              <Text style={[styles.alertTitle, isDay ? styles.dayText : styles.nightText]}>Missing Name</Text>
              <Text style={[styles.alertMessage, isDay ? styles.dayText : styles.nightText]}>
                Please enter your name to continue
              </Text>
              <TouchableOpacity 
                style={[styles.alertButton, isDay ? styles.dayButton : styles.nightButton]}
                onPress={() => setShowNameAlert(false)}
              >
                <Text style={styles.alertButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    );
  }

  if (showDifficulty) {
    return (
      <View style={[styles.centered, isDay ? styles.dayTheme : styles.nightTheme]}>
        <View style={styles.difficultyContainer}>
          <Text style={[styles.difficultyTitle, isDay ? styles.dayText : styles.nightText]}>Select Difficulty</Text>
          
          <TouchableOpacity 
            style={[styles.difficultyButton, isDay ? styles.dayButton : styles.nightButton]}
            onPress={() => selectDifficulty('easy')}
          >
            <Text style={styles.difficultyButtonText}>Easy</Text>
            <Text style={styles.difficultyDescription}>Larger gaps, slower speed</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.difficultyButton, isDay ? styles.dayButton : styles.nightButton]}
            onPress={() => selectDifficulty('medium')}
          >
            <Text style={styles.difficultyButtonText}>Medium</Text>
            <Text style={styles.difficultyDescription}>Balanced gameplay</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.difficultyButton, isDay ? styles.dayButton : styles.nightButton]}
            onPress={() => selectDifficulty('hard')}
          >
            <Text style={styles.difficultyButtonText}>Hard</Text>
            <Text style={styles.difficultyDescription}>Smaller gaps, faster speed</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.backButton, isDay ? styles.dayButton : styles.nightButton]}
            onPress={() => {
              setShowDifficulty(false);
              setEnteredName(false);
            }}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDay ? styles.dayTheme : styles.nightTheme]}>
      <StatusBar style={isDay ? "dark" : "light"} />
      <View style={styles.headerContainer}>
        <Text style={[styles.header, isDay ? styles.dayText : styles.nightText]}>
          FlappyBall - {playerName}
        </Text>
        <Ionicons 
          name={isDay ? "sunny" : "moon"} 
          size={24} 
          color={isDay ? "#f59e0b" : "#f1f5f9"} 
        />
      </View>

      {showPlayButton && !running && (
        <TouchableOpacity 
          style={[styles.playButton, isDay ? styles.dayButton : styles.nightButton]}
          onPress={startGame}
        >
          <Text style={styles.playButtonText}>Play</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity 
        onPress={handleJump} 
        style={[styles.gameArea, isDay ? styles.dayGameArea : styles.nightGameArea]}
        activeOpacity={1}
      >
        <View style={[styles.ball, { top: ballY.current }, isDay ? styles.dayBall : styles.nightBall]} />
        {obstacles.current.map((obs, index) => (
          <View key={index}>
            <View style={[styles.obstacle, { left: obs.x, height: obs.topHeight }, isDay ? styles.dayObstacle : styles.nightObstacle]} />
            <View style={[styles.obstacle, {
              left: obs.x,
              top: obs.topHeight + GAP_SIZE,
              height: 600 - obs.topHeight - GAP_SIZE,
            }, isDay ? styles.dayObstacle : styles.nightObstacle]} />
          </View>
        ))}
      </TouchableOpacity>

      <Text style={[styles.score, isDay ? styles.dayText : styles.nightText]}>Score: {score}</Text>

      <Modal
        visible={showGameOverModal}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDay ? styles.dayModal : styles.nightModal]}>
            <Text style={[styles.modalTitle, isDay ? styles.dayText : styles.nightText]}>Game Over!</Text>
            <Text style={[styles.modalScore, isDay ? styles.dayText : styles.nightText]}>Score: {score}</Text>
            
            <View style={styles.modalButtonsContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, isDay ? styles.dayButton : styles.nightButton]}
                onPress={goToHome}
              >
                <Text style={styles.modalButtonText}>Back</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, isDay ? styles.dayButton : styles.nightButton]}
                onPress={startGame}
              >
                <Text style={styles.modalButtonText}>Play Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[styles.leaderboard, isDay ? styles.dayLeaderboard : styles.nightLeaderboard]}>
        <Text style={[styles.leaderboardTitle, isDay ? styles.dayText : styles.nightText]}>
          Leaderboard - {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </Text>
        <FlatList
          data={leaderboard[difficulty]}
          keyExtractor={(item, index) => `${item.name}-${item.date}-${index}`}
          renderItem={({ item, index }) => (
            <View style={styles.leaderboardItemContainer}>
              <Text style={[styles.leaderboardItem, isDay ? styles.dayText : styles.nightText]}>
                {index + 1}. {item.name} - {item.score}
              </Text>
              <Text style={[styles.leaderboardDate, isDay ? styles.dayText : styles.nightText]}>
                {item.date}
              </Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
  },
  dayTheme: {
    backgroundColor: '#f8f9fa',
    backgroundImage: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
  },
  nightTheme: {
    backgroundColor: '#0f172a',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: 15,
    borderRadius: 15,
    marginHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dayText: {
    color: '#2d3436',
  },
  nightText: {
    color: '#f1f5f9',
  },
  gameArea: {
    flex: 1,
    borderRadius: 20,
    margin: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  dayGameArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  nightGameArea: {
    backgroundColor: '#1e293b',
  },
  ball: {
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    position: 'absolute',
    left: 100,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  dayBall: {
    backgroundColor: '#74b9ff',
  },
  nightBall: {
    backgroundColor: '#facc15',
  },
  obstacle: {
    width: OBSTACLE_WIDTH,
    position: 'absolute',
    top: 0,
    borderRadius: 10,
  },
  dayObstacle: {
    backgroundColor: '#a4b0be',
  },
  nightObstacle: {
    backgroundColor: '#64748b',
  },
  score: {
    fontSize: 28,
    textAlign: 'center',
    marginVertical: 10,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  restartButton: {
    margin: 10,
    padding: 15,
    borderRadius: 10,
  },
  dayButton: {
    backgroundColor: '#3b82f6',
  },
  nightButton: {
    backgroundColor: '#f59e0b',
  },
  restartText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  leaderboard: {
    padding: 15,
    borderRadius: 15,
    margin: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  dayLeaderboard: {
    backgroundColor: '#ffffff',
  },
  nightLeaderboard: {
    backgroundColor: '#1e293b',
  },
  leaderboardTitle: {
    fontSize: 20,
    marginBottom: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  leaderboardItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  leaderboardItem: {
    fontSize: 16,
    fontWeight: '500',
  },
  leaderboardDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 36,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  inputContainer: {
    width: '90%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  input: {
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    padding: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  playButtonText: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  backButton: {
    width: '80%',
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  backButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dayModal: {
    backgroundColor: '#fff',
  },
  nightModal: {
    backgroundColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  modalScore: {
    fontSize: 24,
    marginBottom: 25,
    fontWeight: 'bold',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  modalButton: {
    padding: 15,
    borderRadius: 15,
    width: '45%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  startButton: {
    width: '80%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  difficultyContainer: {
    width: '90%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 30,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  difficultyTitle: {
    fontSize: 32,
    marginBottom: 30,
    textAlign: 'center',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  difficultyButton: {
    width: '80%',
    padding: 20,
    borderRadius: 15,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  difficultyButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  difficultyDescription: {
    color: 'white',
    fontSize: 14,
    marginTop: 5,
    opacity: 0.8,
  },
  alertModal: {
    width: '80%',
    padding: 25,
    borderRadius: 15,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  alertTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.8,
  },
  alertButton: {
    padding: 12,
    borderRadius: 10,
    width: '50%',
    alignItems: 'center',
  },
  alertButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
