StateMachine = _.Class(function(init, states, transitions, self) {
  this.states = states;
  this.transitions = transitions;
  this.stack = [init];
  if(!this.states[init]) this.states[init] = {};
  this.self = self || {};
  _.each.call(this, states, function(state) {
    state.transitions = state.transitions || {}; 
  }); 
  _.each.call(this, transitions, function(action, when) {
    _.each.call(this, when.split(','), function(when) {
      var parts = when.split('/');
      var state = parts[0];
      var when = parts[1];
      state = this.states[state] = this.states[state] || {};
      transitions = state.transitions = state.transitions || {};
      transitions[when] = StateMachine.BuildTransition(action);
    });
  });
  if(this.states[init].enter) {
    _.local.call(StateMachine, { instance: this, args: __args() }, function() {
      this.states[init].enter.apply(this.self, StateMachine.args);
    }).call(this);
  }
}, {
  proto: {
    state: function(newstate) {
      if(newstate) {
        this.stack[this.stack.length-1] = newstate;
      }
      return this.stack[this.stack.length-1];
    },
    _send: function() {
      var ev = StateMachine.event;
      var current_state = this.states[this.state()] || { transitions: {} };
      var catch_state = this.states['*'] || { transitions: {} };
      var direct_action = current_state.transitions[ev];
      var state_default = current_state.transitions['*'];
      var catch_action = catch_state.transitions[ev];
      var catch_default = catch_state.transitions['*'];

      var action = direct_action;
      if(!action) {
        if(state_default || catch_action) {
          if(state_default && catch_action) {
            console.warn("StateMachine: transition %o in %o has s/* and */ev options",
              ev, this.state()
            );
          }
          action = state_default || catch_action;
        } else action = catch_default;
      }

      if(action) return action.apply(this.self, StateMachine.args);
    },
    send: function(ev) {
      var args = __args();
      return _.local.call(StateMachine, { 
        instance: this,
        event: ev,
        args: __args() 
      }, function() {
        return this._send();
      }).call(this);
    }
  },
  classic: {
    push: function(state) {
      var sm = StateMachine.instance;
      sm.stack.push(state);
      var current_state = sm.states[sm.state()] || {};
      if(current_state.enter) current_state.enter.apply(sm.self, StateMachine.args);
    },
    pop: function() {
      var sm = StateMachine.instance;
      var current_state = sm.states[sm.state()] || {};
      if(current_state.leave) current_state.leave.apply(sm.self, StateMachine.args);
      sm.stack.pop();
    },
    resend: function() {
      StateMachine.instance._send();
    },
    select: function(state) {
      var sm = StateMachine.instance;
      var current_state = sm.states[sm.state()] || {};
      if(current_state.leave) current_state.leave.apply(sm.self, StateMachine.args);
      sm.state(state);
      current_state = sm.states[state] || {};
      if(current_state.enter) current_state.enter.apply(sm.self, StateMachine.args);
    },
    BuildTransition: function(action) {
      try {
        var transition_source = action;
        if(typeof action == 'string') {
          action = action.split(/;\s*/);
        }
        if(action instanceof Array) {
          return function() {
            _.each(this, function(act) {
              act.apply(StateMachine.instance, StateMachine.args);
            });
          }.bind(_.map(action, function(act) {
            switch(typeof act) {
            case 'string':
              var type = act.slice(0,1);
              act = act.slice(1);
              switch(type) {
              case '!':
                if(act == '') return function() { StateMachine.resend(); };
                else {
                  var args;
                  var valid = false;
                  act = act.replace(/^([^(]*)(\(.*\))?$/, 
                    function(match, event, arg_list) {
                      if(arg_list) {
                        args = JSON.parse(
                          '[' + (arg_list).slice(1,-1) + ']'
                        );
                      }
                      valid = true;
                      return event;
                    }
                  );
                  if(!valid) {
                    throw new Error('StateMachine: transition: invalid event');
                  }
                  return function() { 
                    StateMachine.instance.send.apply(StateMachine.instance, 
                      [_.evil_format(act, { event: StateMachine.event })]
                      .concat(args || StateMachine.args)
                    );
                  };
                }
              case '[':
                return function() { StateMachine.push(_.evil_format(act, { event: StateMachine.event })); };
              case ']':
                return function() { StateMachine.pop(); };
              case '=':
                return function() { StateMachine.select(_.evil_format(act, { event: StateMachine.event })); };
              default:
                throw new Error('Unknown act spec: %o', type+act);
              }
              break;
            case 'function':
              return act;
            case 'object':
              debugger;
              return StateMachine.BuildTransition(act);
            }
          }));
        }
        if(action instanceof Function) return action;
      } catch(ex) {
        console.error('StateMachine: bad transition %o', transition_source); 
      }

      console.warning('StateMachine: weird transition %o', transition_source); 
      return function() { 
        console.warning('StateMachine: runing weird transition %o', transition_source); 
      };
    }
  }
});

Litijs = _.Class(function(selector, src, callback) {
  var emit = new StateMachine('file', {
    code: {
      enter: function() {
        this.node = $('<div class="section"/>').appendTo(this.node);
      },
      leave: function() {
        this.node = this.node.parent();
      }
    },
    source: {
      enter: function() {
        this.node = $('<pre class="prettyprint"/>').appendTo(this.node);
        this.remove_one_source_line = true;
      },
      leave: function() {
        this.node = this.node.parent().parent();
      }
    },
    note: {
      enter: function() {
        this.node = $('<div class="note"/>').appendTo(this.node).wrap('<div class="wrapper"/>');
        this.node = $('<p/>').appendTo(this.node);
      },
      leave: function() {
        this.node = this.node.parent().parent();
      }
    },
    title: {
      enter: function() {
        this.node = $('<h1/>').appendTo(this.node);
      },
      leave: function() {
        this.node = this.node.parent();
      }
    },
    subtitle: {
      enter: function() {
        this.node = $('<h2/>').appendTo(this.node);
      },
      leave: function() {
        this.node = this.node.parent();
      }
    },
    space: function() {
    },
    haml: {
      enter: function() {
        this.haml_stack = [{indentation: -1, haml: []}];
      },
      leave: function() {
        var haml;
        while(this.haml_stack.length) haml = this.haml_stack.pop().haml;
        //console.log("haml: %o => %o", haml, JSON.stringify(haml));
        if(haml) {
          this.haml = this.node 
                    = $('<div/>').addClass('haml').appendTo(this.node);
          function writeHtml(parent, haml) {
            var node = parent;
            _.each(haml, function(haml) {
              var parsed;
              if(haml instanceof Array) {
                return writeHtml(node, haml);
              }
              haml.trim().replace(
                /^\s*(?:%([^.{\s]*))?((?:\.[a-zA-Z0-9._-]+)*)?(?:#([a-zA-Z0-9.-]+))?({[^}]*})?(.*)/,
                function(match, tag, klass, id, attr, text) {
                  parsed = {
                    node: !!(tag || klass || id),
                    tag: tag || 'div',
                    klass: klass ? klass.slice(1).split(',').join(' ') : '',
                    attr: _.either(function() { return JSON.parse(attr); }).result || {},
                    text: (text || '').trim(),
                    id: id || false
                  };
                }
              );

              //console.log('writing; %o -> %o', haml, parsed);

              //if(parsed.text == '|') debugger;
              if(!parsed.node && parsed.text) {
                if(parsed.text.slice(0,1) == '|') {
                  parsed.text = parsed.text.slice(1);
                }
                else {
                  parsed.text = parsed.text.replace(/^_/, ' ');
                  parsed.text = parsed.text.replace(/_$/, ' ');
                }
                parent.appendText(parsed.text ? parsed.text : '\n');
              } else {
                node = $(_.evil_format('<%{tag}/>', { tag: parsed.tag }))
                   .addClass(parsed.klass)
                   .attr(parsed.attr)
                   .text(parsed.text)
                   .appendTo(parent);
                if(parsed.id) node.attr('id', parsed.id);
              }
            });
          };
          writeHtml(this.node, haml);
          this.haml_example = Litijs.show_html(this.haml).insertBefore(this.node);
          this.node = this.node.parent();
        }
      }
    },
    text: {
      enter: function() {
        this.node = $('<p/>').appendTo(this.node);
      },
      leave: function() {
        this.node = this.node.parent();
      }
    },
    example: {
      enter: function() {
        this.example_code = "";
        this.example_display = "";
        this.example_nodes = [];
        this.node = $('<pre class="prettyprint"/>').appendTo(this.node);
      },
      leave: function() {
        function tree_parse(text, options) {
          var matches = 0;
          text.replace(new RegExp(options.left_split.source, 'g'), 
            function(match, arg) {
              // match, matches..., index, source
              matches = arguments.length - 3; 
            }
          );
          var split = text.split(options.left_split);
          var stack = [];
          var tree = ['(root)', split[0]];
          split = split.slice(1);
          while(split.length) {
            var subtree = split.slice(0, matches);
            split = split.slice(matches);
            var part = split[0];
            split = split.slice(1);
            var chain = part.split(options.right_split);
            subtree.push(chain[0]);
            stack.push(tree); tree.push(subtree); tree = subtree;
            _.each(chain.slice(1), function(part) {
              tree = stack.pop();
              tree.push(part);
            });
          };
          return tree;
        }
        var parse_options = {
          left_split: /@([a-zA-Z]?)\(/,
          right_split: /@\)/
        };
        var tree = tree_parse(this.example_display, parse_options);
        (function writeTree(tree, root) {
          this.node = $('<span/>').appendTo(this.node);
          if(!root) {
            var id = 'example-span-' + Litijs.example_span_id++;
            this.example_nodes.push({id: id, type: tree[0]});
            this.node.attr('id', id);
          }
          _.each.call(this, tree.slice(1), function(part) {
            if(part instanceof Array) writeTree.call(this, part, false);
            else this.node.appendText(part);
          });
          this.node = this.node.parent();
        }).call(this, tree, true);

        this.example_code = this.example_code.replace(
            new RegExp(parse_options.left_split.source, 'g'), function() {
          var exnode = this.example_nodes.shift();
          return 'Litijs.annotate( "#' + exnode.id +  '" , ' 
            + JSON.stringify(exnode.type) + ', (function() { return ('
        }.bind(this)).replace(new RegExp(parse_options.right_split.source, 'g'), 
           '); })).call(this)'
        );
        
        this.example = this.node;
        this.node = this.node.parent();
        if(!this.example_display) {
          this.example.remove();
          delete this.example;
        }
        try {
          _.local.call(Litijs, { context: this }, 
            new Function('node',
              '{' + this.example_code + '\n}'
            )
          ).call(this, this.example);
        } catch(ex) {
          console.error('Failed to eval: %o\n%o', 
            this.example_code, ex.stack);
        }
      }
    },
    file: {
      enter: function() {
      },
      leave: function() {
      }
    }
  }, {
    '*/*': '=%{event}; !',
    '*/note': '=code; !',
    'code/note': '[note; !',
    'note/source': ']; [source; !',
    '*/source' : '!note(""); !',
    'source/*,source/note': ']; !',
    '*/anchor,source/anchor' : function(anchor) {
      this.node.append($('<a/>').attr('name', anchor).attr('id', 'litijs.' + anchor));
    },
    'note/note': function(note) {
      this.process(note);
    },
    'source/source': function(source) {
      if(this.remove_one_source_line) {
        var lines = source.split('\n');
        if(!/[^\s]/.test(lines[0])) {
          source = lines.slice(1).join('\n');
        }
        delete this.remove_one_source_line;
      }
      this.node.appendText(source);
    },
    'text/space': function() {
      StateMachine.select('space');
    },
    '*/space': function() {},
    'file/text': function(line) {
      var metadata = this.metadata;
      line.replace(/^\s*(.*)\s*:\s*(.*)\s*$/, function(m,key,value) {
        metadata[key] = value;
        return m;
      });
    },
    'text/text': function(line) {
      this.process(line);
    },
    'haml/haml': function(haml) {
      var top = this.haml_stack.pop();
      var indentation = -1;
      haml.replace(/[^\s]/, function(m,i) { indentation = i; });
      haml = haml.slice(indentation);
      if(indentation < 0) { this.haml_stack.push(top); return; }
      if(indentation > top.indentation) {
        //console.log("i: %o, haml: %o\n\ttop: %o\n\tstack: %o", indentation, haml, JSON.stringify(top), JSON.stringify(this.haml_stack));
        var haml_node = [haml];
        top.haml.push(haml_node);
        this.haml_stack.push(top);
        this.haml_stack.push({haml:haml_node, indentation:indentation});
      } else if(indentation == top.indentation) {
        top.haml.push(haml);
        this.haml_stack.push(top);
      } else {
        var matched = false;
        while(indentation < top.indentation) {
          top = this.haml_stack.pop();
        }
        while(indentation > top.indentation) console.error('mismatched indentation!');
        top.haml.push(haml);
        this.haml_stack.push(top);
      }
    },
    'example/example': function(line) {
      if(line.slice(0,1) == '!') {
        line = line.slice(1);
      } else {
        this.example_display += line + "\n";
      }
      this.example_code += line + "\n";
    },
    'title/title': function(title) {
      var anchor = title.trim().replace(/\s+/g, '_');
      this.node.append($('<a/>').attr('name', anchor).attr('id', 'litijs.' + anchor));
      this.node.appendText(title);
    },
    'subtitle/subtitle': function(title, options) {
      if(!options.hidden || /@/.test(title)) {
        var anchor = title.trim().replace(/\s+/g, '_');
        this.node.append($('<a/>').attr('name', anchor).attr('id', 'litijs.' + anchor));
      }
      this.process(title);
    }
  }, { 
    metadata : {},
    process: function(line) {
      var links = [];
      var dtdd = false;
      line = line.replace(/(.*)=>(.*)/, function(match, term, definition) {
        var last_node = this.node.contents().last().filter('.definitions');
        if(last_node.length) this.node = last_node;
        else this.node = $('<div/>').appendTo(this.node).addClass('definitions');
        this.node = $('<div/>').appendTo(this.node).addClass('entry');
        this.node = $('<div/>').appendTo(this.node).addClass('term');
        this.process(term);
        this.node = $('<div/>').appendTo(this.node.parent()).addClass('definition');
        this.process(definition);
        this.node = this.node.parent().parent().parent();
        dtdd = true;
        return '';
      }.bind(this));
      if(dtdd) return;
      var link_regex = /([@<>]){([^}|]*)(\|[^}]*)?}/g;
      line.replace(link_regex, function(match, type, anchor, text, index) {
        links.push({
          index:index, 
          match: match,
          anchor: anchor,
          text: text ? text.slice(1) : anchor,
          type: type
        });
        return match;
      });
      if(links.length == 0) {
        if(!/[^\s]/.test(line)) {
          this.node = $('<p/>').appendTo(this.node.parent());
        } else {
          this.node.appendText(line);
        }
      } else {
        this.node.appendText(line.slice(0,links[0].index));
        _.each.call(this, links, function(link, index) {
          var a = $('<a/>').text(link.text).attr(
            link.type == '@' ? 'name' : 'href', 
            link.type == '>' ? '#' + link.anchor : link.anchor
          ).appendTo(this.node);
          if(link.type == "@") a.attr('id', 'litijs.' + link.anchor);
          var to_append;
          if(index < links.length-1) {
            to_append = line.slice(
              link.index + link.match.length, 
              links[index+1].index
            );
          } else {
            to_append = line.slice(link.index + link.match.length);
          }
          
          this.node.appendText(to_append);
        });
      }
    },
    node: 
      $('<div class="litijs">')
      .appendTo(
        $('<div class="litijs-container"/>')
        .appendTo(selector)
      ) 
  });
  jQuery.ajax({
    url: src, 
    cache: false,
    success: function(result, status) {
      if(status == 'success') {
        var parsed = Litijs.parse(result);
        _.each.call(this, parsed, function(part) {
          emit.send(part.type, part.text, part);
        });
        emit.send("text", "");
        prettyPrint(); 
        callback && callback();
      }
    }, 
    dataType: 'html'
  });
}, {
  classic: {
    example_span_id: 0,
    parse: function(source) {
      var fn = jQuery.fn.litijs;
      var result = [];
      source.replace(/(?:[ \t]*(\/\/\/.*))|(\/\*(?:[^*]|\*[^\/])*\*\/)|((?:[^\/]|\/(?:[^*\/]|\/[^\/]))*(?:[^\/ \t]|\/(?:[^*\/ \t]|\/[^\/ \t]))+)/g, function(match, linecomment, comment, source) {
        if(!match || !/[^\s]/.test(match)) {
          return "";
        } else if(source) {
          return result.push({type:'source', text: source});
        } else if(linecomment) {
          result.push({type:'note', text:linecomment.slice(3)});
        } else if(comment) {
          var lines = comment.split("\n");
          var html = $('<div/>');
          _.each(lines, function(line) {
            var header = line.slice(0,2);
            line = line.slice(2);
            switch(header) {
            case '--': 
              return result.push({type: 'title', text:line});
            case '-|': 
              return result.push({type: 'subtitle', text:line});
            case '-!': 
              return result.push({type: 'subtitle', text:line, hidden: true});
            case ' |':
              if(!/[^\s]/.test(line)) {
                return result.push({type: 'space', text:line});
              }
              return result.push({type: 'text', text:line});
            case ' >':
              return result.push({type: 'example', text:line});
            case ' +':
              return result.push({type: 'haml', text:line});
            }
          });
        }
        return '';
      });
      return result;
    },
    show_html: function(html) {
      text = (function parse_element(elem, dent, info) {
        if(elem.nodeType == 3 /* Node.TEXT_NODE */) {
          return elem.textContent.split(/[\r\n]/).join(dent);
        }
        else if(elem.nodeType != 1) {
          debugger;
          return '';
        }
        var tag = '<' + elem.tagName.toLowerCase() 
          + _.map(elem.attributes, function(attr) {
            return ' ' + attr.name + '=' + '"' + attr.value + '"';
          }).join('') + '>';
        var content, contents = [];
        var end_tag = '</' + elem.tagName.toLowerCase() + '>';
        var indent = dent + '  ';
        _.each(elem.childNodes, function(node) {
          var content = parse_element(node, indent, {});
          if(content) contents.push(content);
        });
        if(contents.length) {
          content = contents.join(indent);
          if(/\n/.test(content) || content.length > 30) {
            tag = tag + indent;
            end_tag = dent + end_tag; 
          }
          return tag + content + end_tag;
        } else {
          return tag.slice(0,-1) + '/>';
        }
      })(html[0], '\n', {});

      return $('<pre/>').text(text).addClass('prettyprint lang:html');
    }
  }
});
    
// vim: set sw=2 ts=2 expandtab :
