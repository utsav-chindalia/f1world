import { RacingLineService } from './racing-line';
import { LeaderboardService } from './leaderboard';
import { PlayerService } from './player';

// Test data
const testPlayer = {
    username: 'test_driver_' + Date.now()
};

const testLapData = {
    lapTime: 120000, // 2 minutes in milliseconds
    points: [
        { x: 100, y: 100, speed: 200 },
        { x: 200, y: 200, speed: 250 },
        { x: 300, y: 300, speed: 300 }
    ],
    metadata: {
        trackConditions: 'dry',
        timestamp: Date.now()
    },
    track_id: 'test_track_1' // Adding track_id
};

// Utility function to format time
function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = Math.floor(ms % 1000);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
}

// Test functions
async function testPlayerService() {
    console.log('\n=== Testing PlayerService ===');
    try {
        // Test player creation
        console.log('Creating test player...');
        const player = await PlayerService.upsertPlayer(testPlayer);
        console.log('Player created:', player);

        // Test getting player profile
        console.log('\nFetching player profile...');
        const profile = await PlayerService.getPlayerProfile(player.id);
        console.log('Player profile:', profile);

        // Test player updates subscription
        console.log('\nSetting up player updates subscription...');
        const subscription = PlayerService.subscribeToPlayerUpdates(player.id, (payload) => {
            console.log('Player update received:', payload);
        });
        console.log('Subscription set up:', subscription);

        return player;
    } catch (error) {
        console.error('PlayerService test failed:', error);
        throw error;
    }
}

async function testRacingLineService() {
    console.log('\n=== Testing RacingLineService ===');
    try {
        // Test saving racing line
        console.log('Saving test racing line...');
        const result = await RacingLineService.saveRacingLine(testLapData);
        console.log('Racing line saved:', result);

        // Test getting best racing line
        console.log('\nFetching best racing line...');
        const bestLine = await RacingLineService.getBestRacingLine();
        console.log('Best racing line:', bestLine);

        // Test racing line subscription
        console.log('\nSetting up racing line subscription...');
        const subscription = RacingLineService.subscribeToNewRacingLines((payload) => {
            console.log('New racing line received:', payload);
        });
        console.log('Subscription set up:', subscription);

        return result;
    } catch (error) {
        console.error('RacingLineService test failed:', error);
        throw error;
    }
}

async function testLeaderboardService() {
    console.log('\n=== Testing LeaderboardService ===');
    try {
        // Test getting leaderboard
        console.log('Fetching leaderboard...');
        const leaderboard = await LeaderboardService.getLeaderboard({ limit: 5 });
        console.log('Leaderboard entries:', leaderboard);

        // If we have a test player, test personal bests
        if (testPlayer.id) {
            console.log('\nFetching personal bests...');
            const personalBests = await LeaderboardService.getPersonalBests(testPlayer.id);
            console.log('Personal bests:', personalBests);
        }

        // Test leaderboard subscription
        console.log('\nSetting up leaderboard subscription...');
        const subscription = LeaderboardService.subscribeToLeaderboard((payload) => {
            console.log('Leaderboard update received:', payload);
        });
        console.log('Subscription set up:', subscription);

        return leaderboard;
    } catch (error) {
        console.error('LeaderboardService test failed:', error);
        throw error;
    }
}

// Run all tests
async function runAllTests() {
    console.log('Starting service tests...');
    console.log('Time:', new Date().toISOString());
    
    try {
        // Test player service first to get a player ID
        const player = await testPlayerService();
        testPlayer.id = player.id;

        // Test racing line service
        await testRacingLineService();

        // Test leaderboard service
        await testLeaderboardService();

        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Tests failed:', error);
    }
}

// Export test functions for individual testing
export const ServiceTests = {
    testPlayer: testPlayerService,
    testRacingLine: testRacingLineService,
    testLeaderboard: testLeaderboardService,
    runAll: runAllTests
};

// Auto-run tests if this file is executed directly
if (import.meta.url === import.meta.main) {
    runAllTests();
} 