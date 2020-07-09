(async () => {
  const { download } = require('./index')
  const data = await download('http://localhost/Steve1.mp4', { retry: 10, onError: (e, i) => {
      console.log(e, i)
    } })
  console.log(data)
})()


// download entire an image, no cdn
// const image = await download('https://ggs.io/background.png')
// download entire an image with cdn
// const image = await download({
//    url: 'https://cdn.ggs.io/background.png',
//    checksumUrl: 'https://ggs.io/background.png'
// })
// download with options
// const video = await download({
//    url: 'https://cdn.ggs.io/intro.mp4',
//    checksumUrl: 'https://ggs.io/intro.mp4'
// }, {
//   retry: 10,
//   range: { length: 1024 * 1024 }, /*first 1MB, similar too { end: 1024 * 1024 - 1 } or { start: 0, length: 1024 * 1024 }  or { start: 0, end: 1024 * 1024 - 1 }  */
//   onError: (e, i) => console.log(`Error ${e} at try ${i}`), // error handle at i failed
//   generateChecksum: data => md5(UInt8Array(data)) // custom md5 checksum, in-case data need to modify before generate hash
// })
