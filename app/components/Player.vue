<template>
  <div class="player">
    <div id="dz-root"></div>
  </div>
</template>

<script>
  export default {
    name: 'Player',
    data() {
      return {
      };
    },
    methods: {
      loadtrack: function(id) {
      },
      createPlayer: function(){}
    },
    created: function(){
      console.log('C');
    },
    mounted(){
      console.log('mounted');
    }

  };
</script>
