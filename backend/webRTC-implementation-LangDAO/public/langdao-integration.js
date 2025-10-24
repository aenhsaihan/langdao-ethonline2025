/**
 * LangDAO Integration Script
 * This script should be included in the webRTC page to notify the backend
 * when a student enters the room.
 */

(function() {
  console.log('🔌 LangDAO Integration Script Loaded');

  // Get session info from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const studentAddress = urlParams.get('student');
  const tutorAddress = urlParams.get('tutor');
  const sessionId = urlParams.get('session');

  console.log('Session info from URL:', { studentAddress, tutorAddress, sessionId });

  // Check if this is a student (has student parameter)
  if (studentAddress && tutorAddress && sessionId) {
    console.log('👨‍🎓 This is a student joining the room');

    // Connect to LangDAO backend socket
    const BACKEND_URL = 'http://localhost:4000'; // Change for production
    
    // Use Socket.IO client (must be loaded in the page)
    if (typeof io !== 'undefined') {
      console.log('Connecting to LangDAO backend...');
      
      const socket = io(BACKEND_URL, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      socket.on('connect', () => {
        console.log('✅ Connected to LangDAO backend:', socket.id);

        // Get session data from sessionStorage (set by StudentTutorFinder)
        const pendingSessionStr = sessionStorage.getItem('pendingSession');
        
        if (pendingSessionStr) {
          const pendingSession = JSON.parse(pendingSessionStr);
          console.log('Found pending session:', pendingSession);

          // Emit student-entered-room event
          console.log('📡 Emitting student:entered-room event');
          socket.emit('student:entered-room', {
            requestId: pendingSession.requestId,
            studentAddress: pendingSession.studentAddress,
            tutorAddress: pendingSession.tutorAddress,
            languageId: pendingSession.languageId,
            videoCallUrl: pendingSession.videoCallUrl,
          });

          // Clear session storage
          sessionStorage.removeItem('pendingSession');
          console.log('✅ Session storage cleared');
        } else {
          console.warn('⚠️ No pending session found in sessionStorage');
          
          // Fallback: use URL parameters
          console.log('Using URL parameters as fallback');
          socket.emit('student:entered-room', {
            requestId: sessionId,
            studentAddress: studentAddress,
            tutorAddress: tutorAddress,
            languageId: 1, // Default
            videoCallUrl: window.location.href,
          });
        }
      });

      socket.on('student:room-entry-confirmed', (data) => {
        console.log('✅ Room entry confirmed by backend:', data);
      });

      socket.on('error', (error) => {
        console.error('❌ Socket error:', error);
      });

      socket.on('disconnect', () => {
        console.log('🔌 Disconnected from LangDAO backend');
      });

      // Store socket globally for debugging
      window.langdaoSocket = socket;
      console.log('💡 Socket stored in window.langdaoSocket for debugging');
    } else {
      console.error('❌ Socket.IO client not found! Make sure to include socket.io-client in your HTML');
    }
  } else {
    console.log('👨‍🏫 This is a tutor or missing parameters, no action needed');
  }
})();
