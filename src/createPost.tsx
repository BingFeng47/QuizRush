import { Devvit } from '@devvit/public-api';

// Configure Devvit's plugins
Devvit.configure({
  redditAPI: true,
});

// Adds a new menu item to the subreddit allowing to create a new post
Devvit.addMenuItem({
  label: 'Quiz Rush',
  location: 'subreddit',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    const post = await reddit.submitPost({
      title: 'Play Quiz Rush',
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <image 
                    url="QR-Loading-681-512.png" 
                    imageWidth={750} 
                    imageHeight={512} 
                    resizeMode="cover"
                  />
        </vstack>
      ),
    });
    ui.showToast({ text: 'Post Created!' });
    ui.navigateTo(post);
  },
});
