console.log('jsStringLong...');
jsStringLong(jsStringLong+'');
console.log('\ncodemirror.js...');
jsStringLong(require('fs').readFileSync('shell/imports/cm/cm.js')+'');
console.log('\ncodemirror.css...');
jsStringLong(require('fs').readFileSync('shell/imports/cm/cm.css')+'');
console.log('\ntypescript.js...');
jsStringLong(require('fs').readFileSync('node_modules/typescript/lib/tsc.js')+'');

function jsStringLong(text) {

  var dummy = {};

  var startCompress = Date.now();

  var tree = buildCompressionTree(text, defineWordBreaker());

  var encodedDictionary = encodeDictionaryCompacted(tree.words);

  var compressTime = Date.now() - startCompress;

  console.log('stream: '+tree.bitstream[0]+' bits, '+tree.bitstream.length+' integers, '+(((tree.bitstream[0]+7)/8)|0)+' bytes');
  console.log('dictBody: '+encodedDictionary.dictBody.length+' characters: '+encodedDictionary.dictBody.slice(0,300));
  console.log('dictEntryBits: '+encodedDictionary.dictEntryBits[0]+' bits, '+encodedDictionary.dictEntryBits.length+' integers, '+(((encodedDictionary.dictEntryBits[0]+7)/8)|0)+' bytes');
  var compressLength=tree.bitstream.length*4 + encodedDictionary.dictBody.length+ encodedDictionary.dictEntryBits.length*4;
  console.log('text: '+text.length+', compressed: '+compressLength+', '+(((1000*compressLength/text.length)|0)/10)+'%');
  console.log('taken '+((compressTime/100)|0)/10+' sec.');
  // TODO: generate JS code containing compressed text and expanding into proper string


  function defineWordBreaker() {
    var prev = -1, wlen = 0;

    return breakWord;

    function breakWord(chCode) {
      if (!wlen) return continueWord(chCode);

      if (isUppercase(prev)) {
        if (isUppercase(chCode)) return continueWord(chCode);
        else return startNewWord(chCode);
      }
      else if (isLowercase(prev)) {
        if (isLowercase(chCode)) return continueWord(chCode);
        else return startNewWord(chCode);
      }
      else if (isDigit(prev)) {
        if (isDigit(chCode)) return continueWord(chCode);
        else return startNewWord(chCode);
      }
      else if (prev===32 /* space */) { // combine 4 spaces or less into one word -- indentation unit
        if (chCode===32 /* space */ && wlen<=4) return continueWord(chCode);
        else return startNewWord(chCode);
      }
      else if (prev===9 /* tab */) { // combine 4 tabs or less into one word -- indentation unit
        if (chCode===9 /* tab */ && wlen<=4) return continueWord(chCode);
        else return startNewWord(chCode);
      }
      else if (prev===13 /* CR */) {
        if (chCode===10 /* LF */) return continueWord(chCode);
        else return startNewWord(chCode);
      }
      else {
        if (prev===chCode) // TODO: detect two-char common sequences, such as: () [] /*
        	return completeWord(chCode);
        else
          return startNewWord(chCode);
      }
    }


    function continueWord(chCode) {
      wlen++;
      prev = chCode;
    }

    function startNewWord(chCode) {
      prev= chCode;
      var len = wlen;
      wlen = 1;
      return len;
    }

    function completeWord(chCode) {
      var len = wlen+1;
      wlen = 0;
      return len;
    }

    function isUppercase(chCode) {
      return (chCode>=65 && chCode<=90) /*A-Z*/;
    }

    function isLowercase(chCode) {
      return (chCode>=97 && chCode<=122) /*a-z*/;
    }

    function isDigit(chCode) {
      return (chCode>=48 && chCode<=57) /*0-9*/;
    }


  }

  function buildCompressionTree(text, breakWord) {

    // windex is 0-based word-index, as all words are assigned an integer index
    var windexSequence = []; // list of windices of the original text
    var windexInfos = []; // {freq, word, bits} in an array indexed by windex 
    var dict = {}; // word to windex

    populateDict();
    allocCodes();
    var numFreq1 = 0, numFreq2 = 0, maxFreq1Bits = 0, minFreq1Bits = 0, maxFreq2Bits = 0, minFreq2Bits = 0, minLenFreq1 = 0, maxLenFreq1 = 0, minLenFreq2 = 0, maxLenFreq2 = 0;
    for (var i = 0; i < windexInfos.length; i++) {
      if (windexInfos[i].freq===1)  {
        if (!numFreq1) {
          numFreq1= 1;
          maxFreq1Bits = minFreq1Bits = windexInfos[i].bits[0];
          maxLenFreq1 = minLenFreq1 = windexInfos[i].word.length;
        }
        else {
          numFreq1++;
          maxFreq1Bits = Math.max(maxFreq1Bits, windexInfos[i].bits[0]);
          minFreq1Bits = Math.min(minFreq1Bits, windexInfos[i].bits[0]);
          maxLenFreq1 = Math.max(maxLenFreq1, windexInfos[i].word.length);
          minLenFreq1 = Math.min(minLenFreq1, windexInfos[i].word.length);
        }
      }
      if (windexInfos[i].freq===2)  {
        if (!numFreq2) {
          numFreq2= 1;
          maxFreq2Bits = minFreq2Bits = windexInfos[i].bits[0];
          maxLenFreq2 = minLenFreq2 = windexInfos[i].word.length;
        }
        else {
          numFreq2++;
          maxFreq2Bits = Math.max(maxFreq2Bits, windexInfos[i].bits[0]);
          minFreq2Bits = Math.min(minFreq2Bits, windexInfos[i].bits[0]);
          maxLenFreq2 = Math.max(maxLenFreq2, windexInfos[i].word.length);
          minLenFreq2 = Math.min(minLenFreq2, windexInfos[i].word.length);
        }
      }
    }
    console.log('Freq1: '+numFreq1+' words taking '+(minFreq1Bits===maxFreq1Bits ? minFreq1Bits+' bits' : 'from '+minFreq1Bits+' to '+maxFreq1Bits)+', length '+minLenFreq1+' to '+maxLenFreq1);
    console.log('Freq2: '+numFreq2+' words taking '+(minFreq2Bits===maxFreq2Bits ? minFreq2Bits+' bits' : 'from '+minFreq2Bits+' to '+maxFreq2Bits)+', length '+minLenFreq2+' to '+maxLenFreq2);
    console.log('Freq1 and Freq2 together: '+(numFreq1+numFreq2)+' words taking '+(Math.min(minFreq1Bits, minFreq2Bits)===Math.max(maxFreq1Bits, maxFreq2Bits) ? minFreq2Bits+' bits' : 'from '+Math.min(minFreq1Bits, minFreq2Bits)+' to '+Math.max(maxFreq1Bits, maxFreq2Bits)));

    var bitst = buildBitStream();

    return { bitstream: bitst, words: windexInfos };

    function populateDict() {
      var wordStart = 0;
      for (var i = 0; i < text.length; i++) {
        var chCode = text.charCodeAt(i);
        var wordSize = breakWord(chCode);
        if (!wordSize) continue;
        addWord();
      }
      wordSize = text.length - wordStart;
      if (wordSize) addWord();

      function addWord(){
        var word = text.slice(wordStart, wordStart+wordSize);

        var key = wordKey(word);
        var windex = dict[key]||0;
        if (!windex || !windexSequence.length) {
          windex = windexInfos.length;
          windexInfos.push({
            freq: 1,
            word: word,

            // this is going to be allocated later
            bits: null,

            // these are to be used at dictionary pack stage
            windex: windex,
            dictBodyOffset: 0

          });
          dict[key] = windex;
        }
        else {
          windexInfos[windex].freq++;
        }

        windexSequence.push(windex);
        wordStart+=wordSize;
      }
    }

    function allocCodes() {
      var weightree = buildWeightree();

      var bits = [0];
      walkTreeAlloc(weightree[0]);

      function walkTreeAlloc(we) {
        if (we.wi) {
          we.wi.bits = bitsClone(bits);
          return;
        }

        bitsExtend(bits);
        bitsHighSet(bits, 0);

        walkTreeAlloc(we.we1); // with "0" bit added

        bitsHighSet(bits, 1);
        walkTreeAlloc(we.we2); // with "1" bit added

        bitsContract(bits);
      }

      function buildWeightree() {
        var weightree = [];
        for (var i = 0; i < windexInfos.length; i++) {
          var wi = windexInfos[i];
          weightree.push({ wi: wi, weight: wi.freq, we1: null, we2: null });
        }
        weightree.sort(function(we1, we2) {
          return we1.weight>we2.weight ? -1 : we1.weight < we2.weight ? +1 : 0;
        });

        while (weightree.length>1) {
          var we1 = weightree.pop();
          var we2 = weightree.pop();
          var combine = { wi: null, weight: we1.weight+we2.weight, we1: we1, we2: we2 };
          // find insertion point (is it usually closer to the tail end?)
          if (!weightree.length) {
            var insertAt = 0;
          }
          else {
            var insertAt = weightree.length;
            while (insertAt && weightree[insertAt-1].weight<combine.weight) {
              insertAt--;
            }
          }
          weightree.splice(insertAt, 0, combine);

        }

        return weightree;
      }
    }

    function buildBitStream() {
      var bits = [0];

			for (var i = 0; i < windexSequence.length; i++) {
        var windex = windexSequence[i];
        var wi = windexInfos[windex];
        bitsAppendHigher(bits, wi.bits);
    	}

      return bits;
    }

  }

  function encodeDictionaryCompacted(windexInfos) {
    var wordsSorted = windexInfos.slice(0);
    var dictBody = '';

    populateDictBodyAndSortWords();

    // figuring out how large per-word leading block would take
    // (followed by variable-length bits for that word)
    var maxWordDistance = 0;
    var maxBitsLength = 0;
    for (var i = 0; i<windexInfos.length; i++) {
      maxBitsLength = Math.max(maxBitsLength, windexInfos[i].bits[0]);
      var dist = windexInfos[i].dictBodyOffset - (i ? windexInfos[i-1].dictBodyOffset : 0);
      maxWordDistance = Math.max(maxWordDistance, dist);
    }


    var bits = [0];

    var fitBitsLength = bitsCountToFit(maxBitsLength);
		var fitDistance = bitsCountToFit(maxWordDistance);

    // bit-stream variables will be used to append corresponding tiny integer values to the bit stream
    // the size of each smal tiny integer value is fixed
    var encodedBitsLength = [fitBitsLength, 0];
    var encodedDistance = [fitDistance, 0];

    for (var i = 0; i < windexInfos.length; i++) {

      var dist = windexInfos[i].dictBodyOffset - (i ? windexInfos[i-1].dictBodyOffset : 0);
      encodedDistance[1] = dist;
      bitsAppendHigher(bits, encodedDistance);

      encodedBitsLength[1] = windexInfos[i].bits[0];
      bitsAppendHigher(bits, encodedBitsLength);

      bitsAppendHigher(bits, windexInfos[i].bits);
    }

    return {
      dictBody: dictBody,
      dictEntryBits: bits,
      fitBitsLength: fitBitsLength,
      fitDistance: fitDistance
    };

    function bitsCountToFit(maxValue) {
      for (var bitsCount = 32; !(maxValue & (0xFFFFFFFF<<(bitsCount-1))); bitsCount--) {}
      return bitsCount;
    }

    function populateDictBodyAndSortWords() {
      // now sort by length, long words first
      // (chances are short words will find their matches in longer ones)
      wordsSorted.sort(function(w1, w2) {
        return w1.word.length>w2.word.length ? -1 : w1.word.lengh<w2.word.length ? +1 : 0;
      });

      for (var i = 0; i < wordsSorted.length; i++) {
        wordsSorted[i].dictBodyOffset = dictBody.indexOf(wordsSorted[i].word);
        if (wordsSorted[i].dictBodyOffset<0) {
          wordsSorted[i].dictBodyOffset = dictBody.length;
          dictBody += wordsSorted[i].word;
        }
      }

      // sort again, making words roughly in their order in dictBody
      wordsSorted.sort(function(w1, w2) {
        return w1.dictBodyOffset<w2.dictBodyOffset ? -1 : w1.dictBodyOffset>w2.dictBodyOffset ? +1 : // firstly, list words in order of them appearing in dictBody
          w1.word.length>w2.word.length ? +1 : w1.word.length<w2.word.length ? -1 : 0; // for words with the same prefix, list shorter first
      });
    }
  }

  function bitsString(bits) {
    var result = '';
    var num = (bits[0]/32)|0;
    for (var i = 0; i<num; i++) {
      if (result.length) result='-'+result;
      for (var j = 0; j < 32; j++) {
        if ((bits[i+1]>>j)&1)
          result='1'+result;
        else
          result='0'+result;
      }
    }
    for (var j = 0; j < bits[0]%32; j++) {
      if (result.length && !j) result='-'+result;

      if((bits[bits.length-1]>>j)&1)
        result='1'+result;
      else
        result='0'+result;
    }

    return result;
  }

  function bitsExtend(bits) {
    if ((bits[0]++)%32) return;
    if (bitsNumlen(bits)>bits.length-1) bits.push(0);
  }

  function bitsContract(bits){
    bits[0]--;
  }

  function bitsHighSet(bits, value) {
    if (value)
      bits[bitsNumlen(bits)] |= 1 << (bits[0]%32-1);
    else
      bits[bitsNumlen(bits)] &= ~(1 << (bits[0]%32-1));
  }

  function bitsClone(bits) { 
    return bits.slice(0, bitsNumlen(bits)+1);
  }

  function bitsNumlen(bits) {
    return ((bits[0]+31)/32)|0;
  }

  function bitsAppendHigher(bits, otherBits) {
    if(!otherBits || !otherBits[0]) return;

    // otherBits will need to shift this number of bits 
    var shift = bits[0]%32;
    var copyCount = ((otherBits[0]+31)/32)|0;
    var targetOffset = ((bits[0]/32)|0) + 1;

    for (var copyIndex = 0; copyIndex < copyCount; copyIndex++, targetOffset++) {
      if (shift) {

        if (bits.length<targetOffset) bits.push(0);

        bits[targetOffset+copyIndex] =
          (bits[targetOffset+copyIndex] & ~(0xFFFFFFFF<<shift))
          | (otherBits[copyIndex+1]<<shift);

        if (otherBits[0]>(copyIndex+1)*32-shift) {
          if (bits.length<targetOffset+1) bits.push(0);
          bits[targetOffset+copyIndex+1] =
            otherBits[copyIndex+1]>>>(32-shift);
        }
      }
      else {
        bits[targetOffset] = otherBits[copyIndex+1];
      }
    }

    bits[0] += otherBits[0];
  }

  function wordKey(word) {
    if (word in dummy) return '-'+word;
    else return word;
  }
}