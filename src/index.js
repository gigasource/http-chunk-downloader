const axios = require('axios');
const md5 = require('md5');

/**
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
 * @param {String | Object} src download url
 * @param {String} src.url: CDN url
 * @param {String} src.checksumUrl: checkSum Url
 * @param {Object} config
 * @param {Boolean} [config.skipCheck=true]: Skip checksum checking step
 * @param {Number} [config.range.start=0]: start offset
 * @param {Number} [config.range.end]: end offset
 * @param {Number} [config.range.length]: Number of unit will be received, only used if range.end is missing
 * @param {Number} [config.retry=1]: Number the number of time try to re-download if failed
 * @param {Function} [config.onError]: Error handle function to handle error e at download number i
 * @param {Function} [config.generateChecksum=md5]: Custom generate checksum on received data. If not provided, default 'md5' will be used
 * @returns {Promise<null|*>}
 */
async function download(src, config) {
  let url
  let checksumUrl

  if (typeof src !== 'string') {
    url = src.url
    checksumUrl = src.checksumUrl
  } else {
    url = src
    checksumUrl = src
  }

  let { skipCheck, range, retry, onError, generateChecksum } = config
  generateChecksum = generateChecksum || md5
  retry = retry || 1

  let cfg, checksumCfg;
  if (range) {
    let { start, end, length } = range;
    start = start || 0
    end = end || (start + (length || 1) - 1)
    cfg = {
      responseType: 'arraybuffer',
      headers: { 'range': `bytes=${start}-${end}` }
    };
    checksumCfg = {
      responseType: 'arraybuffer',
      headers: { 'range': `bytes=${start}-${end}`, 'check_sum': 1, }
    }
  }

  // obtain checksum info
  let checkSum
  if (!skipCheck) {
    for(let i=0;i<retry;++i) {
      try {
        checkSum = (await axios.get(checksumUrl, checksumCfg)).data.toString()
        break
      } catch (e) {
        onError && onError(e, i)
      }
    }

    if (!checkSum)
      throw "Can not obtain checksum information"
  }

  let data
  let ourCheckSum
  for(let i=0;i<retry;++i) {
    try {
      data = (await axios.get(url, cfg)).data

      if (skipCheck)
        return data

      ourCheckSum = generateChecksum(data)
      if (checkSum === ourCheckSum) {
        return data
      } else {
        onError && onError({
          message: `Checksum mismatch. Expect: ${checkSum}, Received: ${ourCheckSum}`
        }, i)
      }
    } catch (e) {
      onError && onError(e, i)
    }
  }

  throw "Download failed"
}

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

module.exports = download
