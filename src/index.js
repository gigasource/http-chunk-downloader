const axios = require('axios')
const md5 = require('md5')
const fs = require('fs')
const tmp = require('tmp-promise')

/**
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
 * @param {String | Object} src download url
 * @param {String} src.url: CDN url
 * @param {String} src.checksumUrl: checkSum Url
 * @param {Object} config
 * @param {Boolean} [config.skipCheck]: Skip checksum checking step
 * @param {Number} [config.range.start=0]: start offset
 * @param {Number} [config.range.end]: end offset
 * @param {Number} [config.range.length]: Number of unit will be received, only used if range.end is missing
 * @param {Number} [config.retry=1]: Number the number of time try to re-download if failed
 * @param {Function} [config.onError]: Error handle function to handle error e at download number i
 * @param {Function} [config.generateChecksum=md5]: Custom generate checksum on received data. If not provided, default 'md5' will be used
 * @returns {Promise<null|*>}
 */
async function downloadChunk(src, config) {
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
      headers: { 'range': `bytes=${start}-${end}`, 'check_sum': 1, }
    }
  }

  // obtain checksum info
  let checkSum
  if (!skipCheck) {
    for(let i=0;i<retry;++i) {
      try {
        checkSum = (await axios.get(checksumUrl, checksumCfg)).data
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
      const filePath = await _downloadToFile(url, cfg)
      if (skipCheck)
        return filePath
      const readStream = fs.createReadStream(filePath)
      const data2 = await _stream2Buffer(readStream)
      ourCheckSum = generateChecksum(data2)
      readStream.close()
      if (checkSum === ourCheckSum) {
        return filePath
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

/**
 * @param {String | Object} src download url
 * @param {String} src.url: CDN url
 * @param {String} src.checksumUrl: checkSum Url
 * @param config
 * @param {Boolean} [config.skipCheck]: Skip checksum checking step
 * @param {Number} [config.retry=1]: Number the number of time try to re-download if failed
 * @param {Function} [config.onError]: Error handle function to handle error e at download number i
 * @param {Function} [config.generateChecksum=md5]: Custom generate checksum on received data. If not provided, default 'md5' will be used
 * @returns {Promise<void>}
 */
async function download(src, config) {
  let chunkSizeInBytes = config.chunkSizeInBytes || 1024 * 1024 // 1 MB
  if (chunkSizeInBytes <= 0)
    throw `Invalid chunk size: ${chunkSizeInBytes}`

  console.log('Downloading chunks...')
  const filePaths = []
  let start = 0
  while(true) {
    const filePath = await downloadChunk(src, { ...config, range: { start, length: chunkSizeInBytes } })
    filePaths.push(filePath)
    const fileStat = fs.statSync(filePath)
    if (fileStat.size !== chunkSizeInBytes)
      break;
    start += chunkSizeInBytes
  }

  console.log('Joining chunks...')
  const outputFile = tmp.tmpNameSync()
  for(let filePath of filePaths) {
    await _appendFile(filePath, outputFile)
    fs.unlinkSync(filePath)
  }

  // const stat = fs.statSync(outputFile)
  // console.log(stat)
  // const outputHash = await md5(await _stream2Buffer(fs.createReadStream(outputFile)))
  // const serverHash = (await axios.get(src, { headers: { 'check_sum': 1 } })).data
  // console.log(outputHash)
  // console.log(serverHash)

  return outputFile
}

function _appendFile(fsrc, fdest) {
  return new Promise((resolve, reject) => {
    const f1 = fs.createReadStream(fsrc)
    const f2 = fs.createWriteStream(fdest, { flags: 'a' })
    f2.on('error', reject)
    f2.on('finish', resolve)
    f1.pipe(f2)
  })
}
function _stream2Buffer(stream) {
  return new Promise((resolve) => {
    const bufs = [];
    stream.on('data', d => bufs.push(d))
    stream.on('end', () => {
      resolve(Buffer.concat(bufs))
    })
  })
}
async function _downloadToFile(url, config) {
  const filePath = tmp.tmpNameSync()
  const writer = fs.createWriteStream(filePath)
  config.responseType = 'stream'
  const response = await axios.get(url, config)
  response.data.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', () => {
      resolve(filePath)
    })
    writer.on('error', reject)
  })
}

module.exports = {
  download,
  downloadChunk
}
