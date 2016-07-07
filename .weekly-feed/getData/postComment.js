var fs = require('mz/fs');
var argv = require('yargs').argv;
var prompt = require('prompt');
var confirm = require('confirm-simple');
var request = require('request');
var token = require('./token.json').github;
var mustache = require('mustache');

var issueTpl = `| power# | likes | comments | shares |
|:------:|:-----:|:--------:|:------:|
| # {{ order }} | {{ power.1 }} | {{ power.2 }} | {{ power.3 }} |
* [fb permalink](https://fb.com/{{ id }}) @ \`{{ created_time }}\`
* who: [{{{ from.name }}}](https://facebook.com/{{ from.id }})
![](https://graph.facebook.com/{{ from.id }}/picture?width=60&height=60)
{{# message }}
* intro:
\`\`\`
{{{ message }}}
\`\`\`
{{/ message }}
{{# icon }}
> ![]({{{ icon }}}): [{{ name }}]({{{ link }}})
{{/ icon }}
{{# description }}
> {{{ description }}}
{{/ description }}
{{#picture}}
> ![]({{{ picture }}})
{{/picture}}`;

console.log('>>> Start comments to GitHub issue! <<<');

prompt.get([{
  name: 'numberOfIssue',
  validator: /^\d+$/,
  default: argv.issueNumber,
  warning: 'must to be number!'
}, {
  name: 'date',
  default: argv.date,
  validator: /^\d{4}\-\d{2}\-\d{2}$/,
  warning: 'must to be date!'
}, {
  name: 'user',
  default: 'Rplus',
  validator: /^\w+$/,
  warning: 'must to be good name!'
}], (err, result) => {
  if (err) { console.log(err); return; }

  var url = `https://api.github.com/repos/${result.user}/weekly-collection/issues/${result.numberOfIssue}`;

  console.log(url);

  request({
    url: `${url}?access_token=${token}`,
    headers: {'User-Agent': 'WC'}
  }, (err, res, body) => {
    if (err) { console.log(err); return; }

    var title = JSON.parse(body).title;

    if (!/^week - \d{4}-\d{2}-\d{2}/.test(title) && title.split(' ')[2] !== result.date) {
      console.log('Date is not matched');
      return;
    }

    confirm(`Is issue title: ${JSON.parse(body).title}?`, ['Y', 'N'], (answer) => {
      if (!answer) { return; }

      fs.readFile(`.weekly-feed/2016-06-26.json`, 'utf-8', (err, data) => {
        if (err) { console.log(err); return; }

        var top20 = JSON.parse(data);

        var issue20 = top20.map((feed, index) => {
          feed.order = index + 1;

          if (feed.description) {
            feed.description = feed.description.replace(/\n/gm, '\n> ');
          }

          return mustache.render(issueTpl, feed);
        });

        issue20.forEach((i, index) => {
          console.log(JSON.stringify({body: i}));
          setTimeout(function () {
            request.post({
              url: `${url}/comments?access_token=${token}`,
              form: JSON.stringify({body: i}),
              headers: {'User-Agent': 'WC'}
            }, (err, httpResponse, body) => {
              if (err) { console.log(err); return; }
              console.log(JSON.parse(body));
            });
          }, index * 100);
        });
      });
    });
  });
});
