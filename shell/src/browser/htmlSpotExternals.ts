declare namespace htmlSpotExternals {

  type Redirect = {
    original: string;
    substituteLead: string;
    substituteTrail: string;
    src: string;
    type: 'script' | 'style';
  };

}

function htmlSpotExternals(html: string): (string|htmlSpotExternals.Redirect)[] {

  if (!html) return typeof html==='string' ? [html] : [];

  var linkStart =
      /(\<script[\s\>])|(\<link[\s\>])|(\<\!\-\-)|(\<style[\s\>])/gim;

  var scriptEndTag = /\<\/script(\s[^\>]*)?\>/gi;
  var styleEndTag = /\<\/style(\s[^\>]*)?\>/gi;

  var pos = 0;

  var result: (string|htmlSpotExternals.Redirect)[] = [];

  while (true) {
    linkStart.lastIndex = pos;
    var match = linkStart.exec(html);

    appendStatic(match ? match.index : html.length);

    if (!match) break;

    if (match[1]) {
      // opening script tag
      var tagEnd = html.indexOf('>', match.index+7 /* "<script".length */);
      if (!tagEnd) {
        pos = match.index;
        appendStatic(html.length);
        break;
      }
      var openingTagText = html.slice(match.index, tagEnd);
      var srcMatch = /\ssrc=((\"([^\"]+)\")|(\'([^\']+)\')|(([^\'\"\s][^\s]*)(\s|$)))/.exec(openingTagText);
      var src = srcMatch ? srcMatch[3] || srcMatch[5] || srcMatch[7] : null;

      scriptEndTag.lastIndex = tagEnd+1;
      var scriptEndTagMatch = scriptEndTag.exec(html);
      if (!scriptEndTagMatch) {
        appendStatic(html.length);
        break;
      }

      if (src) {
        result.push({
          original: html.slice(match.index, scriptEndTagMatch.index + scriptEndTagMatch[0].length),
          substituteLead:
          openingTagText.slice(
            0,
            srcMatch.index +
            (srcMatch.index + srcMatch[0].length === openingTagText.length ? 0 : 1)) + // <-- keep whitespace in place of src="..." attribute or not?
          openingTagText.slice(srcMatch.index + srcMatch[0].length) +
          '>',
          substituteTrail: scriptEndTagMatch[0],
          src: src,
          type: 'script'
        });
        pos = scriptEndTagMatch.index + scriptEndTagMatch[0].length;
      }
      else {
        pos = match.index;
        appendStatic(scriptEndTagMatch.index + scriptEndTagMatch[0].length);
      }

    }
    else if (match[2]) {
      // opening link tag
      var tagEnd = html.indexOf('>', match.index+5 /* "<link".length */);
      if (!tagEnd) {
        pos = match.index;
        appendStatic(html.length);
        break;
      }
      var linkTagText = html.slice(match.index, tagEnd);

      var hrefMatch = /\shref=((\"([^\"]+)\")|(\'([^\']+)\')|(([^\'\"\s][^\s]*)(\s|$)))/.exec(linkTagText);
      if (hrefMatch) {
        var href = hrefMatch[3] || hrefMatch[5] || hrefMatch[7];
      }

      if (href && /\srel=((\"stylesheet\")|(\'stylesheet\')|(stylesheet\b))/i.test(linkTagText)) {
        var styleLead =
            '<style'+
            linkTagText.slice(
              5 /* "<link".length */,
              hrefMatch.index +
              (hrefMatch.index + hrefMatch[0].length === linkTagText.length ? 0 : 1)) + // <-- keep whitespace in place of href="..." attribute or not?
            linkTagText.slice(hrefMatch.index + hrefMatch[0].length) +
            '>';
        styleLead = styleLead.replace(/\srel=((\"stylesheet\")|(\'stylesheet\')|(stylesheet\b))/gi, '');

        result.push({
          original: html.slice(match.index, tagEnd+1),
          substituteLead: styleLead,
          substituteTrail: '</style>',
          src: href,
          type: 'style'
        });
        pos = tagEnd+1;
      }
      else {
        pos = match.index;
        appendStatic(tagEnd+1);
      }

    }
    else if (match[3]) {
      // opening HTML comment (skip until comment ends)
      var posCloseComment = html.indexOf('-->', match.index+4 /* "<!--".length */);
      if (posCloseComment>=0)
        appendStatic(posCloseComment + 3 /* "-->".length */);
      else
        appendStatic(html.length);
    }
    else if (match[4]) {
      // opening style tag (skip until style ends)
      var tagEnd = html.indexOf('>', match.index+5 /* "<link".length */);
      styleEndTag.lastIndex = tagEnd+1;
      var styleEndTagMatch = styleEndTag.exec(html);
      if (styleEndTagMatch)
        appendStatic(styleEndTagMatch.index + styleEndTagMatch[0].length);
      else
        appendStatic(html.length);
    }

  }

  return result;

  function appendStatic(upto) {
    if (upto>pos) {
      if (result.length && typeof result[result.length-1]==='string')
        result[result.length-1] += html.slice(pos,upto);
      else
        result.push(html.slice(pos,upto));
    }
    pos = upto;
  }

}
