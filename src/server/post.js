const { currentUnixTimestamp, shorthandAddress, prettifyNumber } = require("./utilities");
const { InMemoryDB, dbConnection } = require('./butterfly');
const { ADMINS } = require("./configs");
const GetComments = require("./get-comments");
const fs = require("fs");
const path = require("path");
const { getTokenBalance } = require("./web3");

const IMAGE_PREFIX = path.join(
  __dirname,
  "..",
  "..",
  "public_html",
  "images",
  "posts"
);

module.exports = class Post {
  constructor(postData) {
    let options = postData.options;
    switch (postData.type) {
      case "proposal":
        options = ["For", "Against"];
        break;
      case "issue":
        options = ["Resolved", "Unresolved"];
        break;
      default:
        break;
    }

    this.data = {
      type: postData.type,
      walletAddress: postData.walletAddress,
      title: postData.title,
      imageUrl: `${postData.filename || ""}`,
      description: postData.description,
      options: options,
      createdAt: currentUnixTimestamp(),
      expiresAt:
        currentUnixTimestamp() + parseInt(postData.duration) * 24 * 3600,
      tags: postData.tags,
      votes: postData.votes?.map((vote) => parseInt(vote)),
      quorum: parseInt(postData.quorum),
    };
  }

  async save() {
    this.data.id = await dbConnection.getNewID(InMemoryDB.POSTS_DB);

    this.data.totalCurrentAddresses = (
      await dbConnection.getAllKeys(InMemoryDB.ADDRESSES_DB)).length;
      await dbConnection.setKey(InMemoryDB.POSTS_DB, this.data.id, this.data);
      return dbConnection.getKey(InMemoryDB.POSTS_DB, this.data.id);
  }

  static async find(postId) {
    const post = await dbConnection.getKey(InMemoryDB.POSTS_DB, postId);
    if (!post) {
      return post;
    }
  
// Parse description for balance placeholders
post.description = await this.parseDescriptionForBalance(post.description);

    const address = await dbConnection.getKey(
      InMemoryDB.ADDRESSES_DB,
      post.walletAddress
    );
  
    const votes = (await dbConnection.getKey(InMemoryDB.VOTES_DB, post.id)) || {};
  
    const comments = await GetComments.findPost(post.id);
  
    return { post, address, votes, comments };
  }
  
  

// updated for pagination
  static async all(filters = {}, query = {}) {
    const { page = 1, limit = 10 } = query; // Default to page 1 and 10 posts per page
    const skip = (page - 1) * limit;

    let postKeys = await dbConnection.getAllKeys(InMemoryDB.POSTS_DB);
    let posts = [];

    for (const key of postKeys) {
        const post = await dbConnection.getKey(InMemoryDB.POSTS_DB, key);
        if (post) {
            posts.push(post);
        }
    }

    // Apply filters
    if (filters.type && filters.type !== "all") {
        posts = posts.filter((post) => post.type === filters.type);
    }

    if (filters.address) {
        posts = posts.filter((post) => post.walletAddress === filters.address);
    }

    if (filters.query) {
        posts = posts.filter((post) =>
            Boolean(this.queryMatchesPost(filters.query, post))
        );
    }

    // Get total count of posts after applying filters
    const totalCount = posts.length;

    // Paginate posts
    const paginatedPosts = posts
        .slice(skip, skip + parseInt(limit))
        .map(async (post) => {
            const address = await dbConnection.getKey(
                InMemoryDB.ADDRESSES_DB,
                post.walletAddress
            );

            if (address) {
                post.username = address.username || shorthandAddress(post.walletAddress);
            } else {
                post.username = shorthandAddress(post.walletAddress); // Fallback
            }

            return post;
        });

    // Resolve promises for username additions
    const resolvedPosts = await Promise.all(paginatedPosts);

    return {
        posts: resolvedPosts.reverse(),
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: parseInt(page),
    };
  }

  static async parseDescriptionForBalance(description) {
    const balanceRegex = /\[balance\](.*?)\[\/balance\]/g; // Matches [balance]walletaddress[/balance]
    const matches = [...description.matchAll(balanceRegex)];
  
    if (matches.length === 0) return description;
  
    for (const match of matches) {
      const walletAddress = match[1].trim();
      const balance = await getTokenBalance(walletAddress); // Fetch balance
      const formattedBalance = balance
        ? `${prettifyNumber(balance)} BEBE`
        : "Balance unavailable";
      const balanceText = `${walletAddress}: ${formattedBalance}`;
      description = description.replace(
        match[0],
        `<span class="wallet-info">${balanceText}</span>`
      ); // Replace placeholder
    }
  
    return description;
  }  
  
  static areCommentsAllowed(post) {
    return !(post.type == "election" && !this.isPostClosed(post));
  }

  static isPostClosed(post) {
    return post.expiresAt - currentUnixTimestamp() < 0;
  }

  static async delete(postId, publicKey) {
    const post = await dbConnection.getKey(InMemoryDB.POSTS_DB, postId);
    if (!post) {
      throw new Error("Post doesn't exist");
    }

    const isAuthorized =
      publicKey === post.walletAddress || ADMINS.includes(publicKey);
    if (!isAuthorized) {
      throw new Error("Not authorized to delete this post");
    }
    await dbConnection.deleteKey(InMemoryDB.POSTS_DB, post.id);
    await dbConnection.deleteKey(InMemoryDB.COMMENTS_DB, post.id);
    await dbConnection.deleteKey(InMemoryDB.VOTES_DB, post.id);
    post.imageUrl &&
      fs.rmSync(path.join(IMAGE_PREFIX, post.imageUrl), { force: true });
      fs.rmSync(path.join(IMAGE_PREFIX+'/thumbnails', post.imageUrl), { force: true });
  }

  static queryMatchesPost(query, post) {
    query = query.toLowerCase();

    if (post.title.toLowerCase().includes(query)) {
      return post;
    } else if (post.tags.toLowerCase().includes(query)) {
      return post;
    } else if (post.description.toLowerCase().includes(query)) {
      return post;
    } else if (
      post.options.join("").toLowerCase().includes(query) ||
      post.options.join("").toLowerCase().includes(query.replace(/\s+/, ""))
    ) {
      return post;
    } else {
      return null;
    }
  }
};

