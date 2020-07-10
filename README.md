I. Introduction

A http-chunk-serve client library which allow download large file into multiple chunk, automatically verify each chunk, merge completed chunks into single file, and retry download if failed.

It's very useful for device which have a bad network connection.

II. Install

```
npm i http-chunk-downloader<version>
```

III. Usage

```javascript
const { download } = require('http-chunk-downloader')
const chunkSize = 1024 * 1024 * 30;

(async () => {
  const file = await download('https://abc.xyz/background.png', { 
    retry: 10, 
    chunkSizeInBytes: chunkSize,
    onError: (e, i) => console.log(`Download chunk ${i} exception: ${e.message}`) 
  })
  console.log('Downloaded file', file)
})
```
