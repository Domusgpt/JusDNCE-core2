// Test script to verify the Gemini API fix is working on deployed site
// Run with: node test-fix-verification.js

async function testDeployedFix() {
    console.log('🎭 Testing jusDNCE API Fix Deployment\n');
    
    const sites = [
        { name: 'GitHub Pages', url: 'https://domusgpt.github.io/JusDNCE-core2/' },
        { name: 'Firebase Production', url: 'https://jusdnce-ai.web.app' }
    ];
    
    for (const site of sites) {
        console.log(`📍 Testing: ${site.name}`);
        console.log(`   URL: ${site.url}\n`);
        
        try {
            // Check deployment status
            const response = await fetch(site.url);
            if (response.ok) {
                console.log('   ✅ Site is accessible');
                
                const html = await response.text();
                
                // Check if the old expired key is gone
                const hasOldKey = html.includes('AIzaSyDFjSQY6Ne38gtzEd6Q_5zyyW65ah5_anw');
                const hasNewKey = html.includes('AIzaSyD_SjDb6huAMMCPdSfxUDlvEM9qwnYEYXQ');
                
                console.log(`   ${hasOldKey ? '❌' : '✅'} Old expired key removed`);
                console.log(`   ${hasNewKey ? '✅' : '❌'} New working key deployed`);
                
                // Check for React app indicators
                const hasReactApp = html.includes('root') && html.includes('script');
                console.log(`   ${hasReactApp ? '✅' : '❌'} React app structure present`);
                
                // Check for jusDNCE specific elements
                const hasJusDNCE = html.includes('jusDNCE') || html.includes('Rajdhani');
                console.log(`   ${hasJusDNCE ? '✅' : '❌'} jusDNCE branding detected`);
                
            } else {
                console.log(`   ❌ Site not accessible (${response.status})`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('🎯 Expected Results:');
    console.log('✅ Old expired key should be gone from both sites');
    console.log('✅ New working key should be present (if visible in bundles)');
    console.log('✅ Users should now be able to generate dance frames');
    console.log('');
    console.log('🎮 Manual Test:');
    console.log('1. Visit https://domusgpt.github.io/JusDNCE-core2/');
    console.log('2. Upload an image');
    console.log('3. Select a style');
    console.log('4. Click "Generate" and verify frames appear');
    console.log('5. Check browser console for any API errors');
}

testDeployedFix().catch(console.error);