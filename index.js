'use strict';

var Tagplay = require('tagplay');
var lightbox = require('tagplay-lightbox');
var postWidget = require('tagplay-standalone-post');
var querystring = require('querystring');
var extend = require('xtend');

var postsPerPage = 18;
var defaultConfig = {
  'include-usernames': true,
  'include-like': true,
  'include-flag': true,
  'include-dates': true,
  'include-times': true,
  include_captions: true,
  'include-link-metadata': true
};

function Gallery (container, config) {
  if (!(this instanceof Gallery)) return new Gallery(container, config);
  console.log(container);

  config = extend(defaultConfig, config);
  this.client = new Tagplay(config);
  this.config = extend(config);
  this.container = container;
  this.posts = [];

  var query = querystring.parse(window.location.search ? window.location.search.substring(1) : '');

  this.page = query.page * 1 || 1;

  this.fetchPosts(this.page);

  var that = this;

  window.onpopstate = function () {
    var query = querystring.parse(window.location.search ? window.location.search.substring(1) : '');

    if (query.page * 1 !== that.page) {
      that.container.innerHTML = '';
      that.fetchPosts(query.page * 1);
    }
  };
}

Gallery.prototype.fetchPosts = function (page, cb) {
  if (!page) page = 1;

  var that = this;

  var spinner = this.getSpinner();

  this.container.appendChild(spinner);

  this.client.listPost(this.config.project, this.config.feed, {limit: postsPerPage, offset: postsPerPage * (page - 1)}, function (err, body) {
    that.container.removeChild(spinner);

    if (err) {
      console.error('[tagplay-gallery] error:', err);
      return cb ? cb(err) : undefined;
    }

    if (body && body.data) {
      that.posts = body.data;
      that.posts.forEach(that.appendPost, that);
    }

    if (body && body.pagination) that.totalPosts = body.pagination.total;

    that.page = page;

    that.addPagination();

    if (cb) cb(null);
  });
};

Gallery.prototype.appendPost = function (post) {
  var that = this;

  this.container.appendChild(postWidget(post, this.config, function () {
    that.openLightbox(post);
  }));
};

Gallery.prototype.getSpinner = function () {
  var spinner = document.createElement('div');
  spinner.setAttribute('class', 'spinner');

  var spinnerContainer = document.createElement('div');
  spinnerContainer.setAttribute('class', 'spinner-container');

  spinnerContainer.appendChild(spinner);

  return spinnerContainer;
};

Gallery.prototype.openLightbox = function (post) {
  lightbox.open(postWidget(post, this.config), this.getCanNavigate(post), this.getNavigate(post));
};

Gallery.prototype.getCanNavigate = function (post) {
  var that = this;
  return function (dir) {
    return that.getNavigatedPost(post, dir) || that.page + dir >= 1 && that.page + dir <= that.getNumPages();
  };
};

Gallery.prototype.getNavigate = function (post) {
  var that = this;
  return function (dir) {
    var nextPost = that.getNavigatedPost(post, dir);
    if (nextPost) {
      that.openLightbox(nextPost);
    } else if (that.page + dir >= 1 && that.page + dir <= that.getNumPages()) {
      lightbox.open(that.getSpinner(), function (dir) { return false; }, function (dir) { });
      that.navigateToPage(that.page + dir, function (err) {
        if (err) return;
        that.openLightbox(that.posts[dir > 0 ? 0 : postsPerPage - 1]);
      });
    }
  };
};

Gallery.prototype.getNavigatedPost = function (currentPost, dir) {
  var index = this.findPostIndex(currentPost);
  if (index === null) return null;

  return this.posts[index + dir] || null;
};

Gallery.prototype.findPostIndex = function (post) {
  for (var i = 0; i < this.posts.length; i++) {
    if (this.posts[i].id === post.id) return i;
  }
  return null;
};

Gallery.prototype.navigateToPage = function (page, cb) {
  window.history.pushState({}, '', '?page=' + page);
  this.container.innerHTML = '';
  this.fetchPosts(page, cb);
};

Gallery.prototype.getNumPages = function () {
  return Math.ceil(this.totalPosts / postsPerPage);
};

Gallery.prototype.addPagination = function () {
  this.container.appendChild(this.generatePagination(this.page, this.getNumPages()));
};

Gallery.prototype.generatePagination = function (currentPage, lastPage) {
  var pagination = document.createElement('ul');
  pagination.setAttribute('class', 'pagination');

  if (lastPage === 1) return pagination;

  var firstShownPage = Math.max(1, currentPage - 3);
  var lastShownPage = Math.min(lastPage, currentPage + 3);

  if (firstShownPage > 1) {
    pagination.appendChild(this.generatePaginationItem(1, false, '&laquo; First'));
  }
  if (firstShownPage > 2) {
    pagination.appendChild(this.generatePaginationItem(null, false, '...'));
  }
  for (var i = firstShownPage; i <= lastShownPage; i++) {
    pagination.appendChild(this.generatePaginationItem(i, i === currentPage));
  }
  if (lastPage - lastShownPage > 1) {
    pagination.appendChild(this.generatePaginationItem(null, false, '...'));
  }
  if (lastShownPage < lastPage) {
    pagination.appendChild(this.generatePaginationItem(lastPage, false, 'Last &raquo;'));
  }

  return pagination;
};

Gallery.prototype.generatePaginationItem = function (page, active, text) {
  if (!text) text = page;

  var that = this;

  var item = document.createElement('li');

  if (active) {
    item.setAttribute('class', 'active');
  }

  var inner;
  if (!page || active) {
    inner = document.createElement('span');
  } else {
    inner = document.createElement('a');
    inner.setAttribute('href', '?page=' + page);
    inner.onclick = function () {
      that.navigateToPage(page);
      return false;
    };
  }
  inner.innerHTML = text;
  item.appendChild(inner);
  return item;
};

Gallery(document.getElementById('gallery'), window.CONFIG || {});
