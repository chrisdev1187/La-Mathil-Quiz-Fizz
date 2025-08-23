import React from "react";
import { useNavigate } from "react-router-dom";

function TriviaTestPage() {
  const navigate = useNavigate();
  const [testResults, setTestResults] = React.useState({});
  const [currentTest, setCurrentTest] = React.useState("");
  const [isRunningTests, setIsRunningTests] = React.useState(false);
  const [testSession, setTestSession] = React.useState(null);
  const [testPlayer, setTestPlayer] = React.useState(null);

  // Test data
  const testQuestions = [
    {
      id: 1,
      question: "What is the capital of France?",
      answers: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      timeLimit: 15,
      category: "geography",
      difficulty: "easy",
      points: 10
    },
    {
      id: 2,
      question: "Which planet is known as the Red Planet?",
      answers: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: 1,
      timeLimit: 10,
      category: "science",
      difficulty: "medium",
      points: 15
    }
  ];

  const runTest = async (testName, testFunction) => {
    setCurrentTest(testName);
    try {
      const result = await testFunction();
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'passed', result, timestamp: new Date().toISOString() }
      }));
      console.log(`✅ ${testName} passed:`, result);
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testName]: { status: 'failed', error: error.message, timestamp: new Date().toISOString() }
      }));
      console.error(`❌ ${testName} failed:`, error);
    }
  };

  // Test 1: Database Connection
  const testDatabaseConnection = async () => {
    const response = await fetch("/api/get-game-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: "TEST-SESSION" })
    });
    
    if (!response.ok) {
      throw new Error(`Database connection failed: ${response.status}`);
    }
    
    const data = await response.json();
    return { connected: true, response: data };
  };

  // Test 2: Session Creation
  const testSessionCreation = async () => {
    const response = await fetch("/api/host-controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_session",
        gameId: "TRIVIA-TEST",
        gameMode: "trivia",
        maxRounds: 5
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Session creation failed: ${data.error}`);
    }
    
    setTestSession(data.session);
    return data.session;
  };

  // Test 3: Question Creation
  const testQuestionCreation = async () => {
    if (!testSession) {
      throw new Error("No test session available");
    }

    const response = await fetch("/api/host-controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_question",
        gameId: "TRIVIA-TEST",
        questionData: testQuestions[0]
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Question creation failed: ${data.error}`);
    }
    
    return data.question;
  };

  // Test 4: Player Join
  const testPlayerJoin = async () => {
    const response = await fetch("/api/join-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "join",
        gameId: "TRIVIA-TEST",
        nickname: "TestPlayer",
        password: ""
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Player join failed: ${data.error}`);
    }
    
    setTestPlayer(data.player);
    return data.player;
  };

  // Test 5: Start Question
  const testStartQuestion = async () => {
    const response = await fetch("/api/host-controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start_question",
        gameId: "TRIVIA-TEST",
        questionData: { id: 1 }
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Start question failed: ${data.error}`);
    }
    
    return data.question;
  };

  // Test 6: Submit Answer
  const testSubmitAnswer = async () => {
    if (!testPlayer) {
      throw new Error("No test player available");
    }

    const response = await fetch("/api/player-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "submit_answer",
        gameId: "TRIVIA-TEST",
        playerId: testPlayer.id,
        questionId: 1,
        answerIndex: 2 // Correct answer for first question
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Submit answer failed: ${data.error}`);
    }
    
    return data.answer;
  };

  // Test 7: End Question
  const testEndQuestion = async () => {
    const response = await fetch("/api/host-controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "end_question",
        gameId: "TRIVIA-TEST"
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`End question failed: ${data.error}`);
    }
    
    return data.results;
  };

  // Test 8: Get Question Results
  const testGetResults = async () => {
    const response = await fetch("/api/host-controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_question_results",
        gameId: "TRIVIA-TEST"
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Get results failed: ${data.error}`);
    }
    
    return data.results;
  };

  // Test 9: Game State Updates
  const testGameStateUpdates = async () => {
    const response = await fetch("/api/get-game-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId: "TRIVIA-TEST" })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Game state update failed: ${data.error}`);
    }
    
    return data.session;
  };

  // Test 10: Cleanup
  const testCleanup = async () => {
    const response = await fetch("/api/host-controls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "delete_session",
        gameId: "TRIVIA-TEST"
      })
    });
    
    const data = await response.json();
    if (!data.success) {
      throw new Error(`Cleanup failed: ${data.error}`);
    }
    
    return { cleaned: true };
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunningTests(true);
    setTestResults({});

    const tests = [
      { name: "Database Connection", fn: testDatabaseConnection },
      { name: "Session Creation", fn: testSessionCreation },
      { name: "Question Creation", fn: testQuestionCreation },
      { name: "Player Join", fn: testPlayerJoin },
      { name: "Start Question", fn: testStartQuestion },
      { name: "Submit Answer", fn: testSubmitAnswer },
      { name: "End Question", fn: testEndQuestion },
      { name: "Get Results", fn: testGetResults },
      { name: "Game State Updates", fn: testGameStateUpdates },
      { name: "Cleanup", fn: testCleanup }
    ];

    for (const test of tests) {
      await runTest(test.name, test.fn);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsRunningTests(false);
    setCurrentTest("");
  };

  const getTestStatus = () => {
    const passed = Object.values(testResults).filter(r => r.status === 'passed').length;
    const failed = Object.values(testResults).filter(r => r.status === 'failed').length;
    const total = Object.keys(testResults).length;
    
    if (total === 0) return "No tests run";
    if (failed === 0) return `All ${passed} tests passed! 🎉`;
    return `${passed} passed, ${failed} failed`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center text-white mb-8">
          <h1 className="text-4xl font-bold mb-4">🧪 Trivia System Test Suite</h1>
          <p className="text-xl mb-4">Comprehensive testing of all trivia components and functionality</p>
          <div className="text-lg font-semibold text-green-300">
            Status: {getTestStatus()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Controls */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Test Controls</h2>
            
            <div className="space-y-4">
              <button
                onClick={runAllTests}
                disabled={isRunningTests}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                {isRunningTests ? `Running ${currentTest}...` : "Run All Tests"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => runTest("Database Connection", testDatabaseConnection)}
                  disabled={isRunningTests}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Test DB
                </button>
                <button
                  onClick={() => runTest("Session Creation", testSessionCreation)}
                  disabled={isRunningTests}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  Test Session
                </button>
              </div>

              <button
                onClick={() => navigate("/")}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Back to Home
              </button>
            </div>
          </div>

          {/* Test Results */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Test Results</h2>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {Object.entries(testResults).map(([testName, result]) => (
                <div
                  key={testName}
                  className={`p-3 rounded-lg ${
                    result.status === 'passed' 
                      ? 'bg-green-500/20 border border-green-500' 
                      : 'bg-red-500/20 border border-red-500'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{testName}</span>
                    <span className={`text-sm ${
                      result.status === 'passed' ? 'text-green-300' : 'text-red-300'
                    }`}>
                      {result.status === 'passed' ? '✅ PASSED' : '❌ FAILED'}
                    </span>
                  </div>
                  {result.error && (
                    <div className="text-red-300 text-sm mt-1">
                      Error: {result.error}
                    </div>
                  )}
                  {result.result && (
                    <div className="text-green-300 text-sm mt-1">
                      Result: {JSON.stringify(result.result).substring(0, 100)}...
                    </div>
                  )}
                  <div className="text-gray-400 text-xs mt-1">
                    {new Date(result.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              
              {Object.keys(testResults).length === 0 && (
                <div className="text-gray-400 text-center py-8">
                  No tests have been run yet. Click "Run All Tests" to start.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Manual Testing Section */}
        <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Manual Testing Guide</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
            <div>
              <h3 className="text-lg font-semibold mb-2">Host Functionality Tests:</h3>
              <ul className="space-y-1 text-sm">
                <li>• Create trivia session</li>
                <li>• Add custom questions</li>
                <li>• Start/end questions</li>
                <li>• View results</li>
                <li>• Manage players</li>
                <li>• Timer controls</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Player Functionality Tests:</h3>
              <ul className="space-y-1 text-sm">
                <li>• Join game session</li>
                <li>• View questions</li>
                <li>• Submit answers</li>
                <li>• See timer countdown</li>
                <li>• View results</li>
                <li>• Track points</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Display Functionality Tests:</h3>
              <ul className="space-y-1 text-sm">
                <li>• Show current question</li>
                <li>• Display timer</li>
                <li>• Show answer options</li>
                <li>• Display results</li>
                <li>• Player rankings</li>
                <li>• Score updates</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">System Integration Tests:</h3>
              <ul className="space-y-1 text-sm">
                <li>• Real-time updates</li>
                <li>• Database persistence</li>
                <li>• Session management</li>
                <li>• Error handling</li>
                <li>• Performance under load</li>
                <li>• Cross-browser compatibility</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TriviaTestPage;
