const axios = require('axios');
const md5 = require('md5');

/**
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Range
 * @param {String} src download url
 * @param {Object} config.range
 * @param {String} [config.range.unit='bytes']: Unit of data range
 * @param {Number} [config.range.start=0]: start offset
 * @param {Number} [config.range.end]: end offset
 * @param {Number} [config.range.length]: Number of unit will be received, only used if range.end is missing
 * @param {Object} config
 * @param {Number} [config.retry=1]: Number the number of time try to re-download if failed
 * @param {Function} [config.onError]: Error handle function to handle error e at download number i
 * @param {Function} [config.generateChecksum=md5]: Custom generate checksum on received data. If not provided, default 'md5' will be used
 * @returns {Promise<null|*>}
 */
async function download(src, config) {
  let {
      range,
      retry,
      onError,
      generateChecksum
  } = config;

  retry = retry || 1
  generateChecksum = generateChecksum || md5

  if (range) {
    let {
      unit,
      start,
      end,
      length
    } = range;

    unit = unit || 'bytes';
    start = start || 0
    end = end || (start + (length || 1) - 1)

    const cfg = {
      responseType: 'arraybuffer',
      headers: {
        'Range': `${unit}=${start}-${end}`
      }
    };

    let response
    for(let i=0;i<retry;++i) {
      try {
        response = await axios.get(src, cfg)
        const checkSum = response.headers['Check_Sum']
        const data = response.data
        const ourCheckSum = generateChecksum(data)
        if (checkSum === ourCheckSum)
          return data
      } catch (e) {
        onError && onError(e, i)
      }
    }

    return null
  } else {
    return (await axios.get(src)).data
  }
}

module.exports = download
