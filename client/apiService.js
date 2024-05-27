const axios = require('axios');

const baseURL = 'http://localhost:3200';

const api = axios.create({
  baseURL,
  //   timeout: 5000, // Set a timeout for requests (optional)
});

const screenshot= async() => {
  try {
    const response = await api.get(`/screenshot`);
    return response
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error
  }
}

// const conversation = (chat) => {
//   return new Promise((resolve, reject) => {
//     api.get(`/conversation?question=${chat}`)
//       .then(response => {
//         resolve(response);
//       })
//       .catch(error => {
//         console.error('Error fetching conversation:', error);
//         reject(error);
//       });
//   });
// }

const conversation = (prompt) => {
  return new Promise((resolve, reject) => {
    console.log(prompt)
    api.post('/run-command', { prompt })
      .then(response => {
        resolve(response);
      })
      .catch(error => {
        console.error('Error fetching conversation:', error);
        reject(error);
      });
  });
}

module.exports = {
  screenshot,
  conversation
}
