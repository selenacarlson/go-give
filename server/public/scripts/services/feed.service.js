myApp.service('FeedService', ['$http', '$location', '$route', function($http, $location, $route) {

    let self = this;

    self.newFeedItem = {};
    self.allFeedItems = {};
    self.editFeedToggle = {show: false };

    self.addFeedItem = function(newFeedItem){
        console.log('added to feed', newFeedItem);
        if (newFeedItem.feed_video){
          let indexToCut = newFeedItem.feed_video.lastIndexOf('=');
          newFeedItem.feed_video = newFeedItem.feed_video.substring(indexToCut+1);
          console.log(newFeedItem.feed_video);
        }
        $http({
            method: 'POST',
            url: '/feed',
            data: newFeedItem
        }).then(function(response){
            // console.log('success in feed item', response);
            self.newFeedItem = {}
            $route.reload();
            self.getFeedItems();
        }).catch(function(error){
            console.log('error in adding a feed',error)
        })
    }
//end addFeedItem

  self.getFeedItems = function (){
    console.log('in get feed items');
    $http({
      method:'GET',
      url: '/feed'
    }).then(function(response){
      // console.log('success in feed item get', response);
      self.allFeedItems.list = response.data.rows;
      console.log(self.allFeedItems.list, 'feed items');
    }).catch(function(error){
      console.log('error in getting all feed items', error);
    })
  }
// end getFeedItem

  self.deleteFeedItem = function(id) {
    console.log('delete item');
    $http({
      method:'DELETE',
      url:`/feed/${id}`
    }).then((response)=>{
      console.log('deleted item');
      self.getFeedItems();
    }).catch((error)=>{
      console.log('error in delete', error);

    })
  }
// end deleteFeedItem

  self.displayFeedItem = function(id){
    // console.log('in display feed');
    $http({
      method:'GET',
      url:`/feed/${id}`
    }).then(function(response){
     let editableFeedItem = response.data.rows[0];
     console.log('fed resp', editableFeedItem);

        self.editFeedToggle.show = true;
        console.log('self.editFeedToggle', self.editFeedToggle);
        $route.reload();
        self.newFeedItem.name = editableFeedItem.name;
        self.newFeedItem.feed_img = editableFeedItem.feed_img_url;
        self.newFeedItem.feed_text = editableFeedItem.feed_text;
        self.newFeedItem.feed_video = editableFeedItem.feed_video_url;
        self.newFeedItem.feed_date = editableFeedItem.feed_date_posted;
        self.newFeedItem.title = editableFeedItem.title;
        self.newFeedItem.id = editableFeedItem.id;
    }).catch((error) => {
      console.log('error in display', error);
    })
    }


  self.updateFeedItem = function(newFeedItem) {
    console.log('updated feed item');
    $http({
      method:'PUT',
      url:`/feed`,
      data: newFeedItem
    }).then((response)=> {
      console.log('success in update', response);
      self.editFeedToggle.show = false;
      self.newFeedItem = {};
      self.getFeedItems();
      $route.reload();

    }).catch((error) => {
      console.log('error in update', error);
    })
  }
  // end updateFeedItem


}]); // end service
