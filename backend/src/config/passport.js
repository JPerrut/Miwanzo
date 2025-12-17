const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user.model');
const { generateToken, calculateExpiry } = require('../utils/auth.utils');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      // Verificar se usuário já existe pelo Google ID
      let user = await User.findByGoogleId(profile.id);
      
      if (!user) {
        // Verificar se email já existe
        const existingUser = await User.findByEmail(profile.emails[0].value);
        
        if (existingUser) {
          // Atualizar usuário existente com Google ID
          const query = 'UPDATE users SET google_id = $1 WHERE id = $2 RETURNING *';
          const result = await db.query(query, [profile.id, existingUser.id]);
          user = result.rows[0];
        } else {
          // Criar novo usuário
          const username = profile.emails[0].value.split('@')[0];
          
          // Garantir que username seja único
          let uniqueUsername = username;
          let counter = 1;
          while (await User.findByUsername(uniqueUsername)) {
            uniqueUsername = `${username}${counter}`;
            counter++;
          }
          
          user = await User.create({
            email: profile.emails[0].value,
            username: uniqueUsername,
            google_id: profile.id,
            avatar_url: profile.photos[0]?.value,
          });
        }
      }
      
      return done(null, user);
    } catch (error) {
      return done(error, null);
    }
  }
));

// Serializar usuário para sessão
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Desserializar usuário da sessão
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;