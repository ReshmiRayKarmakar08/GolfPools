const axios = require('axios');

async function run() {
  try {
    console.log('Logging in...');
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'testuser1@example.com',
      password: 'password123'
    });
    
    const token = loginRes.data.accessToken;
    console.log('Got token:', token.substring(0, 20) + '...');

    console.log('Fetching /api/auth/me...');
    const meRes = await axios.get('http://localhost:5000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Me info:', meRes.data.user.email);

    console.log('Fetching /api/scores...');
    const scoresRes = await axios.get('http://localhost:5000/api/scores', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Scores:', scoresRes.data.scores.length);

    console.log('Adding a score...');
    const addRes = await axios.post('http://localhost:5000/api/scores', {
      score: 34,
      score_date: '2026-03-25'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Add response:', addRes.data);

  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Network Error:', err.message);
    }
  }
}

run();
