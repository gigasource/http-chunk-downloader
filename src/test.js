const download = require('./index')

const data = download('http://localhost/bentley-1.jpg', { range: { length: 100 }, retry: 10, onError: (e, i) => {
    console.log(e)
  }
})

console.log(data)
