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
    gravity: 0.5
  },
  medium: {
    gapSize: 200,
    obstacleSpeed: 4,
    obstacleSpacing: 100,
    gravity: 0.6
  },
  hard: {
    gapSize: 150,
    obstacleSpeed: 5,
    obstacleSpacing: 80,
    gravity: 0.7
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
  const [clouds, setClouds] = useState([
    { x: 50, y: 100, size: 40 },
    { x: 200, y: 150, size: 60 },
    { x: 350, y: 80, size: 50 },
  ]);
  const [stars, setStars] = useState([
    { x: 30, y: 50, size: 2 },
    { x: 100, y: 80, size: 3 },
    { x: 250, y: 40, size: 2 },
    { x: 300, y: 120, size: 4 },
    { x: 150, y: 60, size: 3 },
  ]);
  const [birds, setBirds] = useState([
    { x: 100, y: 50, size: 20 },
    { x: 250, y: 80, size: 15 },
    { x: 400, y: 60, size: 25 },
  ]);

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
          color={isDay ? "#3498db" : "#f1f5f9"} 
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
        {/* Day Elements */}
        {isDay && (
          <>
            {/* Sun */}
            <View style={styles.sun} />
            
            {/* Clouds */}
            {clouds.map((cloud, index) => (
              <View 
                key={`cloud-${index}`}
                style={[
                  styles.cloud,
                  {
                    left: cloud.x,
                    top: cloud.y,
                    width: cloud.size,
                    height: cloud.size * 0.6,
                  }
                ]}
              />
            ))}
            
            {/* Birds */}
            {birds.map((bird, index) => (
              <View 
                key={`bird-${index}`}
                style={[
                  styles.bird,
                  {
                    left: bird.x,
                    top: bird.y,
                    width: bird.size,
                    height: bird.size * 0.5,
                  }
                ]}
              />
            ))}
          </>
        )}

        {/* Night Elements */}
        {!isDay && (
          <>
            {/* Moon */}
            <View style={styles.moon} />
            
            {/* Stars */}
            {stars.map((star, index) => (
              <View 
                key={`star-${index}`}
                style={[
                  styles.star,
                  {
                    left: star.x,
                    top: star.y,
                    width: star.size,
                    height: star.size,
                  }
                ]}
              />
            ))}
            
            {/* Night Clouds */}
            {clouds.map((cloud, index) => (
              <View 
                key={`night-cloud-${index}`}
                style={[
                  styles.nightCloud,
                  {
                    left: cloud.x,
                    top: cloud.y,
                    width: cloud.size,
                    height: cloud.size * 0.6,
                  }
                ]}
              />
            ))}
          </>
        )}

        {/* Ground */}
        <View style={[styles.ground, isDay ? styles.dayGround : styles.nightGround]} />

        <View style={[styles.ball, { top: ballY.current }, isDay ? styles.dayBall : styles.nightBall]} />
        {obstacles.current.map((obs, index) => (
          <View key={index}>
            <View 
              style={[
                styles.obstacle, 
                { left: obs.x, height: obs.topHeight }, 
                isDay ? styles.dayObstacle : styles.nightObstacle
              ]} 
            />
            <View 
              style={[
                styles.obstacle, 
                {
                  left: obs.x,
                  top: obs.topHeight + GAP_SIZE,
                  height: 600 - obs.topHeight - GAP_SIZE,
                }, 
                isDay ? styles.dayObstacle : styles.nightObstacle
              ]} 
            />
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
    paddingTop: 30,
    paddingHorizontal: 10,
  },
  dayTheme: {
    backgroundColor: '#f0f4f8',
    backgroundImage: 'linear-gradient(135deg, #f0f4f8 0%, #e6f0f7 50%, #d9e9f2 100%)',
  },
  nightTheme: {
    backgroundColor: '#0f172a',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  header: {
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  dayText: {
    color: '#2c3e50',
  },
  nightText: {
    color: '#f1f5f9',
  },
  gameArea: {
    flex: 1,
    borderRadius: 15,
    margin: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  dayGameArea: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dayBall: {
    backgroundColor: '#3498db',
  },
  nightBall: {
    backgroundColor: '#facc15',
  },
  obstacle: {
    width: OBSTACLE_WIDTH,
    position: 'absolute',
    top: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  dayObstacle: {
    backgroundColor: '#95a5a6',
    backgroundImage: 'linear-gradient(90deg, #bdc3c7 0%, #95a5a6 50%, #7f8c8d 100%)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
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
    padding: 12,
    borderRadius: 12,
    margin: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
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
    width: '85%',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 240, 241, 0.8)',
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
  },
  input: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    color: '#2c3e50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
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
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    width: '85%',
    alignItems: 'center',
    backgroundColor: 'rgba(236, 240, 241, 0.8)',
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
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
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(52, 152, 219, 0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    width: '75%',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
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
  sun: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f39c12',
    top: 50,
    right: 50,
    shadowColor: '#f39c12',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  moon: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#bdc3c7',
    top: 50,
    right: 50,
    shadowColor: '#bdc3c7',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#95a5a6',
    borderRadius: 1,
    shadowColor: '#95a5a6',
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 2,
  },
  cloud: {
    position: 'absolute',
    backgroundColor: 'rgba(189, 195, 199, 0.7)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  nightCloud: {
    position: 'absolute',
    backgroundColor: 'rgba(149, 165, 166, 0.2)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  bird: {
    position: 'absolute',
    width: 20,
    height: 10,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    backgroundColor: 'rgba(52, 73, 94, 0.7)',
    transform: [{ rotate: '45deg' }],
  },
  ground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  dayGround: {
    backgroundColor: 'rgba(189, 195, 199, 0.3)',
    backgroundImage: 'linear-gradient(180deg, rgba(189, 195, 199, 0.3) 0%, rgba(149, 165, 166, 0.4) 100%)',
  },
  nightGround: {
    backgroundColor: 'rgba(100, 116, 139, 0.3)',
  },
});
