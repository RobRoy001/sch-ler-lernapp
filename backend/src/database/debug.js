const pool = require('./connection');

async function testConnection() {
  console.log('🔍 Starting Supabase Connection Debug...\n');

    // 1. Check env variables
      console.log('1️⃣ Environment Variables:');
        console.log(`   DB_HOST: ${process.env.DB_HOST}`);
          console.log(`   DB_PORT: ${process.env.DB_PORT}`);
            console.log(`   DB_NAME: ${process.env.DB_NAME}`);
              console.log(`   DB_USER: ${process.env.DB_USER}`);
                console.log(`   DB_PASSWORD: ${process.env.DB_PASSWORD ? '✅ Set' : '❌ Missing'}\n`);

                  // 2. Try to connect
                    console.log('2️⃣ Testing Connection...');
                      try {
                          const result = await pool.query('SELECT NOW()');
                              console.log('✅ Connection successful!');
                                  console.log(`   Current DB Time: ${result.rows[0].now}\n`);

                                      // 3. Check users table
                                          console.log('3️⃣ Checking Users Table...');
                                              const usersResult = await pool.query('SELECT COUNT(*) FROM users');
                                                  console.log(`   Total Users: ${usersResult.rows[0].count}\n`);

                                                      console.log('🎉 All checks passed!');
                                                        } catch (err) {
                                                            console.error('❌ Connection failed!');
                                                                console.error(`   Error: ${err.message}`);
                                                                    console.error(`   Code: ${err.code}\n`);

                                                                        console.log('💡 Possible Solutions:');
                                                                            if (err.code === 'ENOTFOUND') {
                                                                                  console.log('   • Host not reachable - check firewall/network');
                                                                                        console.log('   • Supabase host may be down');
                                                                                              console.log('   • Codespaces may have network restrictions');
                                                                                                  }
                                                                                                      if (err.code === 'ECONNREFUSED') {
                                                                                                            console.log('   • Port 5432 not reachable');
                                                                                                                  console.log('   • Check if credentials are correct');
                                                                                                                      }
                                                                                                                        }

                                                                                                                          process.exit(0);
                                                                                                                          }

                                                                                                                          testConnection();