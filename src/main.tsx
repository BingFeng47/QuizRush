import './createPost.js';
import { Devvit, useAsync, useState } from '@devvit/public-api';

// Defines the type of  messages that are exchanged between Devvit and Web View
type WebViewMessage =
  | {
      type: 'initialData';
      data: { username: string, score:number, setterId:string, question: string, option1: string, option2: string, option3: string, option4: string, correctAnswer: string, allQuizzes: any[], leaderboard: any[]};
    }
  |{
      type: 'createQuiz';
      data:{ question: string, option1: string, option2: string, option3: string, option4: string, correctAnswer: string }
    }
  |{
      type: 'reloadData';
      data: {}
    }
  |{
      type: 'getLeaderBoard';
      data: {}
  }
  |{
      type: 'updateScore';
      data: {score: number, setterId: string}
  }
  |{
      type: 'returnInfo';
      data: {quizScore: number, timeUsed: number}
  }

// Configure Devvit with Reddit API and Redis
Devvit.configure({
  redditAPI: true,
  redis: true,
});

// Functions to create a quiz
const createQuiz = async (context:any, quizData: {
  question: string,
  option1: string,
  option2: string,
  option3: string,
  option4: string,
  correctAnswer: string
}) => {
  const currentSubreddit = await context.reddit.getCurrentSubreddit();
  try {
    const post = await context.reddit.submitPost({
      subredditName: currentSubreddit.name,
      title: "I bet you can't solve this quiz!",
      preview: (
        <vstack>
           <image 
            url="QR-Loading-681-512.png" 
            imageWidth={750} 
            imageHeight={512} 
            resizeMode="cover"
          />
        </vstack>
      ),
      flair: "app"
    });

    const user = await context.reddit.getUserById(context.userId);
    const username = user ? user.username : 'anon';

    // Store quiz data in Redis
    const quizKey = `quiz:${post.id}`;
    await context.redis.hSet(quizKey, {
      question: quizData.question,
      option1: quizData.option1,
      option2: quizData.option2,
      option3: quizData.option3,
      option4: quizData.option4,
      correctAnswer: quizData.correctAnswer,
      authorId: context.userId, // Binding to the user
      authorUsername: username, // Binding to the user
      attemptUser: JSON.stringify([]) 
    });
    const quizSet = 'quizSet';
    await context.redis.zAdd(quizSet, { member: `${post.id}:${context.userId}`, score: Date.now() });
    console.log('Quiz saved to redis')
    return post;
  } catch (error) {
    console.error('Error submitting post:', error);
  }
};

// Get all user specific quizzes
const getAllUserQuiz = async (context: any) => {
  const allQuizzes = await context.redis.zRange('quizSet', 0, -1);
  const userQuizIds = [];
  for (const quiz of allQuizzes) {
    const [postId, userId] = quiz.member.split(':');
    if (userId === context.userId) {
      userQuizIds.push(postId);
    }
  }
  const userQuizzes = [];
  for (const postId of userQuizIds) {
    const quizData = await context.redis.hGetAll(`quiz:${postId}`);
    userQuizzes.push(quizData);
  }

  return userQuizzes.reverse();
}

// Update User Total Score
const updateUserScore = async (context: Devvit.Context, score: number, setterId: string) => {
  
  // Update guesser's score
  if (context.userId) {
      const currentScore = await context.redis.zScore('allUserScores', context.userId) || 0;
      const newScore = currentScore + score;
      await context.redis.zAdd('allUserScores', { member: context.userId, score: newScore });

  } else {
    console.error('User ID is undefined');
  }

  // Update setter's score
  if (setterId) {
    const setterScore = await context.redis.zScore('allUserScores', setterId) || 0;
    const newSetterScore = setterScore + 25;
    await context.redis.zAdd('allUserScores', { member: setterId, score: newSetterScore });
  }



};

const getLeaderBoard = async (context: any) => {
  try {
    // Get all users and their scores from the 'allUserScores' sorted set
    // We use 0 and -1 to get all elements, and set reverse to true to get highest scores first
    const leaderboardData = await context.redis.zRange('allUserScores', 0, -1, { reverse: true });
    
    // Format the data into a more usable structure
    const leaderboard = leaderboardData.map((entry:any, index:any) => ({
      rank: index + 1,
      userId: entry.member,
      score: entry.score
    }));

    for (const entry of leaderboard) {
      const user = await context.reddit.getUserById(entry.userId);
      entry.username = user ? user.username : 'anon';
    }

    console.log('Leaderboard:', leaderboard);
    return leaderboard;
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
};

// get user current Score function
const getUserCurrentScore = async (context: any) => {
  try {
    const userScore = await context.redis.zScore('allUserScores', context.userId);
    return userScore;
  } catch (error) {
    console.error('Error fetching user score:', error);
    return null;
  }
};



// Add a custom post type to Devvit
Devvit.addCustomPostType({
  name: 'Quiz Rush',
  height: 'tall', 
  render: (context) => {
    // Load username with `useAsync` hook
    const [username] = useState(async () => {
      const currUser = await context.reddit.getCurrentUser();
      return currUser?.username ?? 'anon';
    });

    const { data: postTitle} = useAsync(async () => {
      const post = await context.reddit.getPostById(context.postId ?? "");
      const postTitle = post.title;
      return JSON.parse(JSON.stringify(postTitle));
    });

    const { data: userQuizzes} = useAsync(async () => {
      const userQuizzes = getAllUserQuiz(context);
      return userQuizzes;
    });

    const { data: leaderboard} = useAsync(async () => {
      const leaderboard = getLeaderBoard(context);
      return leaderboard;
    });

    const { data: userScore} = useAsync(async () => {
      const userScore = getUserCurrentScore(context);
      return userScore?? 0;
    });
    
    const { data: quizData,} = useAsync(async () => {
      if (postTitle !== 'Play Quiz Rush') {
        const quizKey = `quiz:${context.postId}`;
        const rawQuizData = await context.redis.hGetAll(quizKey);
        return JSON.parse(JSON.stringify(rawQuizData));
      }
      return null;
    });
    
    // Get the author username of the quiz
    const quizAuthorUsername = quizData?.authorUsername ?? 'anon';
    const quizAuthorId = quizData?.authorId ?? 'no author found';
    const question = quizData?.question ?? 'No question found';
    const option1 = quizData?.option1 ?? 'No option found';
    const option2 = quizData?.option2 ?? 'No option found';
    const option3 = quizData?.option3 ?? 'No option found';
    const option4 = quizData?.option4 ?? 'No option found';
    const correctAnswer = quizData?.correctAnswer ?? 'No answer found';    

    // Create a reactive state for web view visibility
    const [webviewVisible, setWebviewVisible] = useState(false);

    // When the web view invokes `window.parent.postMessage` this function is called
    const onMessage = async (msg: WebViewMessage) => {
      switch (msg.type) {
        case 'initialData':
          break;

        case 'createQuiz':
          const quizData = msg.data;
          const post = await createQuiz(context, quizData);
          console.log(post)
          context.ui.showToast(`Quiz Created!`);
          context.ui.navigateTo(post);
          break;

          case 'reloadData':
            const userQuizzes = await getAllUserQuiz(context);
            const updatedUserScore = await getUserCurrentScore(context) ?? 0;
            const leaderboard = await getLeaderBoard(context); // Assuming you have this function
          
            context.ui.webView.postMessage('myWebView', {
              type: 'initialData',
              data: {
                username: username,
                score: updatedUserScore,
                correctAnswer: correctAnswer,
                allQuizzes: userQuizzes,
                leaderboard: leaderboard
              },
            });
            break;

          // Update scores
        case 'updateScore':
          const score = msg.data.score;
          const setterId = msg.data.setterId;
          await updateUserScore(context, score, setterId);
          break;

        case 'returnInfo':
          const {quizScore, timeUsed} = msg.data;
          context.ui.webView.postMessage('myWebView', {
            type: 'returnInfo',
            data: {
              quizScore: quizScore,
              timeUsed: timeUsed
            },
          });
          break;
        default:
          throw new Error(`Unknown message type`);
      }
    };

    // When the button is clicked, send initial data to web view and show it
    const onShowWebviewClick = async ( isQuizPost:Boolean ) => {
      setWebviewVisible(true);
      context.ui.webView.postMessage('myWebView', {
        type: 'initialData',
        data: {
          username: username,
          score: userScore,
          setterId: quizAuthorId,
          question: question,
          option1: option1,
          option2: option2,
          option3: option3,
          option4: option4,
          correctAnswer: correctAnswer,
          allQuizzes: userQuizzes,
          leadeboard: leaderboard
        },
      });

      if(isQuizPost){
        const quizKey = `quiz:${context.postId}`;
        const quizData = await context.redis.hGetAll(quizKey);
        const attemptUser = JSON.parse(quizData.attemptUser || '[]');

        if (!attemptUser.includes(context.userId)) {
          attemptUser.push(context.userId);
          // await context.redis.hSet(quizKey, { attemptUser: JSON.stringify(attemptUser) });
        }
      }

    };

    // Render the custom post type
    return (
      <vstack grow={webviewVisible} alignment='center middle'>
        <vstack
          grow={!webviewVisible}
          height={webviewVisible ? '0%' : '100%'}
          alignment="middle center"
        >
          {
            // If the post is a Quiz Rush post, render the Quiz Rush UI, else its a user quiz page
            postTitle == 'Play Quiz Rush' ? (
              <zstack grow alignment='center middle'>
                {/* Fullscreen background image */}
                  <image 
                    url="QR-Mainbg-681-512.png" 
                    imageWidth={750} 
                    imageHeight={512} 
                    resizeMode="cover"
                  />
                
                {/* Overlay content */}
                <vstack alignment="center middle">
                  {/* App title */}
                  <text size="xxlarge" weight="bold" color="white">
                    Quiz Rush!
                  </text>

                  <spacer />

                  {/* Username display */}
                  <hstack>
                    <text size="xlarge" color="white">
                      {username ?? ''}
                    </text>
                  </hstack>

                  <spacer height={10}/>

                  {/* Button */}
                  <button 
                    onPress={() => onShowWebviewClick(false)}  
                  >
                    Play
                  </button>
                </vstack>
              </zstack>
            ):(
            <zstack grow alignment='center middle'>
                {/* Fullscreen background image */}
                  <image 
                    url="QR-Question-681-512.png" 
                    imageWidth={750} 
                    imageHeight={512} 
                    resizeMode="cover"
                  />
                
                {/* Overlay content */}
                <vstack alignment="center middle">
                  {/* App title */}
                  <text size="xxlarge" weight="bold" color='white'>
                    Answer this quiz!
                  </text>
                  <text size="xlarge" weight="bold" color='white'>
                    Post ID: {context.postId ?? 'No post ID found'}
                  </text>

                  <spacer />

                  <vstack alignment="start middle">
                  <hstack>
                    <text size="medium" color='white'>Created By: </text>
                    <text size="xlarge" color='white' weight="bold">
                      {' '}
                      {quizAuthorUsername ?? 'anonymous'}
                    </text>
                    <spacer height={10}/>
                  </hstack>
                </vstack>

                  <spacer />

                  {/* Button */}
                  <button 
                    onPress={()=>{onShowWebviewClick(true)}}  
                  >
                    Take The Quiz!
                  </button>
                </vstack>
              </zstack>
        )}
        </vstack>
        {
          postTitle == 'Play Quiz Rush' ? (
            <vstack grow={webviewVisible} height={webviewVisible ? '100%' : '0%'} width={webviewVisible ? '100%' : '0%'}>
              <vstack height={webviewVisible ? '100%' : '0%'}>
                <webview
                  id="myWebView"
                  url="home.html"
                  onMessage={(msg) => onMessage(msg as WebViewMessage)}
                  grow
                  height={webviewVisible ? '100%' : '0%'}
                />
              </vstack>
            </vstack>
            ):
            
            (context.userId === quizAuthorId || JSON.parse(quizData?.attemptUser || '[]').includes(context.userId)) ? (
            
              <vstack grow={webviewVisible} height={webviewVisible ? '100%' : '0%'} width={webviewVisible ? '100%' : '0%'}>
                <vstack height={webviewVisible ? '100%' : '0%'}>
                  <webview
                    id="myWebView"
                    url="notAllow.html"
                    onMessage={(msg) => onMessage(msg as WebViewMessage)}
                    grow
                    height={webviewVisible ? '100%' : '0%'}
                  />
                </vstack>
              </vstack>)
        :
          (
            <vstack grow={webviewVisible} height={webviewVisible ? '100%' : '0%'} width={webviewVisible ? '100%' : '0%'}>
              <vstack height={webviewVisible ? '100%' : '0%'}>
                <webview
                  id="myWebView"
                  url="answerQuiz.html"
                  onMessage={(msg) => onMessage(msg as WebViewMessage)}
                  grow
                  height={webviewVisible ? '100%' : '0%'}
                />
              </vstack>
            </vstack>
          )

        }
        
      </vstack>
    );
  },
});

export default Devvit;
