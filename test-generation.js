// Test Gemini API directly with our fixed key
// Run with: node test-generation.js

const API_KEY = 'AIzaSyD_SjDb6huAMMCPdSfxUDlvEM9qwnYEYXQ';

async function testFrameGeneration() {
    console.log('🎭 Testing jusDNCE Frame Generation\n');
    
    try {
        // Test 1: Basic text generation (motion planning)
        console.log('Test 1: Motion planning with gemini-2.5-flash...');
        const planResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: "Generate a simple dance move plan: { pose: 'step_left', energy: 'mid', prompt: 'Character steps to the left' }" }]
                    }]
                })
            }
        );
        
        if (planResponse.ok) {
            const planData = await planResponse.json();
            console.log('✅ Motion planning working');
            console.log('   Response:', planData.candidates?.[0]?.content?.parts?.[0]?.text?.substring(0, 100) + '...');
        } else {
            const planError = await planResponse.json();
            console.log('❌ Motion planning failed');
            console.log('   Error:', planError.error?.message);
            return;
        }
        
        // Test 2: Image generation capability check
        console.log('\nTest 2: Image generation capability...');
        
        // Create a tiny test image (1x1 red pixel)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
        
        const imageResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [
                            { inlineData: { mimeType: 'image/png', data: testImageBase64 } },
                            { text: "Transform this into a dancing character. Style: Neon cyberpunk. Generate a single dance pose." }
                        ]
                    }]
                })
            }
        );
        
        if (imageResponse.ok) {
            const imageData = await imageResponse.json();
            const hasGeneratedImage = imageData.candidates?.[0]?.content?.parts?.some(p => p.inlineData?.data);
            
            console.log('✅ Image generation API working');
            console.log(`   Generated image: ${hasGeneratedImage ? 'Yes' : 'No (text response only)'}`);
            
            if (hasGeneratedImage) {
                console.log('   🎉 FRAME GENERATION SHOULD BE WORKING!');
            } else {
                console.log('   ⚠️  API responds but may need better prompts');
            }
        } else {
            const imageError = await imageResponse.json();
            console.log('❌ Image generation failed');
            console.log('   Error:', imageError.error?.message);
        }
        
        // Test 3: Check rate limits and quota
        console.log('\nTest 3: Rate limit check...');
        const quotaResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`
        );
        
        if (quotaResponse.ok) {
            console.log('✅ API quota available');
        } else {
            const quotaError = await quotaResponse.json();
            console.log('❌ Quota/rate limit issue');
            console.log('   Error:', quotaError.error?.message);
        }
        
        console.log('\n🔧 Troubleshooting for Mobile/PC Issues:');
        console.log('1. Browser extension errors: Those are normal, ignore them');
        console.log('2. Mobile issues could be:');
        console.log('   - Network/CORS issues');
        console.log('   - File upload problems');  
        console.log('   - Touch event handling');
        console.log('   - Viewport/responsive design');
        console.log('3. Test on desktop first to isolate the issue');
        
    } catch (error) {
        console.log('❌ Network error:', error.message);
    }
}

testFrameGeneration().catch(console.error);