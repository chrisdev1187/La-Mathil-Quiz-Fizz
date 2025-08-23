# 🧪 Manual Testing Guide for Trivia System

## Overview
This guide provides step-by-step instructions for manually testing all trivia functionality in the Quiz Fizz application.

## Prerequisites
- Frontend server running on port 5174
- Backend server running on port 3002
- Database connection established
- Multiple browser windows/tabs for testing different roles

## Test Scenarios

### Scenario 1: Basic Trivia Session Flow

#### Step 1: Host Setup
1. **Open Host Interface**
   - Navigate to `http://localhost:5174`
   - Click "ADMIN" button
   - Enter password: `Bianca1236`
   - Click "JOIN GAME"

2. **Create Trivia Session**
   - Click "CREATE SESSION" button
   - Enter Session ID: `TEST-TRIVIA-001`
   - Select Mode: `trivia`
   - Set Max Rounds: `5`
   - Click "CREATE SESSION"

3. **Verify Session Creation**
   - Session should appear in the session list
   - Status should be "waiting"
   - Mode should show "trivia"

#### Step 2: Question Management
1. **Add Custom Questions**
   - Click "TRIVIA" tab
   - Click "QUESTIONS" button
   - Click "ADD QUESTION"
   - Fill in question details:
     - Question: "What is the capital of France?"
     - Answer A: "London"
     - Answer B: "Berlin"
     - Answer C: "Paris"
     - Answer D: "Madrid"
     - Correct Answer: C
     - Time Limit: 15 seconds
     - Category: "Geography"
     - Difficulty: "Easy"
     - Points: 10
   - Click "SAVE QUESTION"

2. **Add More Questions**
   - Add 2-3 more questions with different categories
   - Verify questions appear in the list

#### Step 3: Player Joining
1. **Open Player Interface**
   - Open new browser window/tab
   - Navigate to `http://localhost:5174`
   - Click "JOIN GAME"
   - Enter Session Code: `TEST-TRIVIA-001`
   - Enter Nickname: `TestPlayer1`
   - Click "JOIN GAME"

2. **Verify Player Join**
   - Player should appear in host's player list
   - Player should see waiting screen

#### Step 4: Start Trivia Session
1. **Select Quiz Theme (Optional)**
   - In host interface, click "PICK QUIZ"
   - Select a theme if available
   - Click "START THEME QUIZ"

2. **Start First Question**
   - Click "START Q" button
   - Verify question appears on all interfaces
   - Check timer starts counting down

#### Step 5: Player Interaction
1. **Answer Submission**
   - Player should see question and timer
   - Click on an answer option
   - Verify answer is selected
   - Click "LOCK IN ANSWER" (if available)
   - Verify answer is submitted

2. **Timer Behavior**
   - Watch timer countdown
   - Verify timer stops at 0
   - Check visual indicators (color changes, animations)

#### Step 6: Question Results
1. **End Question**
   - Host clicks "END Q" button
   - Verify results appear on all interfaces
   - Check correct answer is highlighted
   - Verify player scores are updated

2. **View Results**
   - Host clicks "RESULTS" button
   - Verify detailed results are shown
   - Check player rankings

#### Step 7: Continue Session
1. **Next Question**
   - Host clicks "NEXT Q" button
   - Verify new question appears
   - Repeat steps 4-6

2. **End Session**
   - Host clicks "END QUIZ" button
   - Verify final results are displayed

### Scenario 2: Advanced Features Testing

#### Timer Controls
1. **Pause/Resume**
   - Start a question
   - Host clicks "PAUSE" button
   - Verify timer stops
   - Host clicks "RESUME" button
   - Verify timer continues

2. **Time Expiration**
   - Start question with short time limit (5 seconds)
   - Let time expire without answering
   - Verify "Time's Up!" message appears
   - Check answer options are disabled

#### Multiple Players
1. **Add More Players**
   - Join 2-3 more players with different nicknames
   - Verify all players appear in host interface
   - Check player list updates in real-time

2. **Concurrent Answers**
   - Start a question
   - Have multiple players answer simultaneously
   - Verify all answers are recorded
   - Check results show all player responses

#### Error Handling
1. **Invalid Session**
   - Try to join non-existent session
   - Verify appropriate error message

2. **Duplicate Nicknames**
   - Try to join with existing nickname
   - Verify error handling

3. **Network Issues**
   - Disconnect network temporarily
   - Verify graceful error handling
   - Reconnect and verify recovery

### Scenario 3: Display Testing

#### Public Display
1. **Open Display Interface**
   - Navigate to `http://localhost:5173/display`
   - Enter session code: `TEST-TRIVIA-001`
   - Click "VIEW DISPLAY"

2. **Question Display**
   - Verify question text is clearly visible
   - Check answer options are properly formatted
   - Verify timer visualization works
   - Test responsive design on different screen sizes

3. **Results Display**
   - Verify results are clearly shown
   - Check leaderboard updates
   - Test animations and visual effects

### Scenario 4: Edge Cases

#### Rapid Question Changes
1. **Quick Succession**
   - Start and end questions rapidly
   - Verify no state conflicts
   - Check all interfaces stay synchronized

#### Large Question Sets
1. **Many Questions**
   - Add 10+ questions to session
   - Run through all questions
   - Verify performance remains good

#### Long Sessions
1. **Extended Play**
   - Run session for 30+ minutes
   - Verify no memory leaks
   - Check performance stability

## Expected Behaviors

### Host Interface
- ✅ Session creation works
- ✅ Question management functions properly
- ✅ Timer controls respond correctly
- ✅ Player list updates in real-time
- ✅ Results display accurately
- ✅ Error messages are clear and helpful

### Player Interface
- ✅ Game joining works smoothly
- ✅ Questions display clearly
- ✅ Answer submission functions
- ✅ Timer countdown works
- ✅ Results are shown properly
- ✅ Points tracking is accurate

### Display Interface
- ✅ Public display shows current state
- ✅ Questions are clearly visible
- ✅ Timer visualization works
- ✅ Results are displayed properly
- ✅ Leaderboard updates correctly

### System Integration
- ✅ Real-time updates work across all interfaces
- ✅ Database persistence functions correctly
- ✅ Error handling is graceful
- ✅ Performance remains stable

## Common Issues to Watch For

1. **Timer Synchronization**
   - Check if timers stay synchronized across interfaces
   - Verify no drift between host and player timers

2. **State Consistency**
   - Ensure all interfaces show the same game state
   - Verify no stale data is displayed

3. **Network Latency**
   - Test with simulated network delays
   - Verify system handles latency gracefully

4. **Browser Compatibility**
   - Test in different browsers (Chrome, Firefox, Safari, Edge)
   - Verify responsive design on mobile devices

## Performance Metrics

### Response Times
- Session creation: < 2 seconds
- Question loading: < 1 second
- Answer submission: < 500ms
- State updates: < 1 second

### Load Testing
- Support 10+ concurrent players
- Handle 50+ questions per session
- Maintain performance for 2+ hour sessions

## Success Criteria

✅ All basic functionality works as expected
✅ Error handling is robust and user-friendly
✅ Performance meets requirements
✅ User experience is smooth and intuitive
✅ Real-time updates work reliably
✅ Database operations are consistent

## Reporting

Document any issues found with:
- Steps to reproduce
- Expected vs actual behavior
- Browser/device information
- Error messages or console logs
- Screenshots if applicable

---

**Test Date**: Current Session
**Tester**: System Administrator
**Status**: Ready for Execution
