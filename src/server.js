require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/database');

connectDB();

const app = express();


app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
  message: {
    status: 'error',
    message: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: {
    status: 'error',
    message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

app.use(morgan('combined'));

app.use(express.json({ limit: '10kb' }));


app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API Bibliothèque sécurisée fonctionnelle',
    timestamp: new Date().toISOString(),
    database: 'MongoDB connecté',
    security: ['JWT', 'bcrypt', 'CORS', 'Rate Limiting', 'Helmet']
  });
});


app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const User = require('./models/User');
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcrypt');
    
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(422).json({
        status: 'error',
        message: 'Tous les champs sont requis'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'Un utilisateur avec cet email existe déjà'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      name: name.trim()
    });

    const token = jwt.sign(
      { 
        sub: user._id, 
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN,
        issuer: 'bibliotheque-api',
        audience: 'bibliotheque-app'
      }
    );

    res.status(201).json({
      status: 'success',
      message: 'Utilisateur créé avec succès',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }
    });

  } catch (error) {
    console.error('❌ Register error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création de l\'utilisateur'
    });
  }
});

app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const User = require('./models/User');
    const jwt = require('jsonwebtoken');
    const bcrypt = require('bcrypt');
    
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(422).json({
        status: 'error',
        message: 'Email et mot de passe sont requis'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Email ou mot de passe incorrect'
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Email ou mot de passe incorrect'
      });
    }

    const token = jwt.sign(
      { 
        sub: user._id, 
        role: user.role,
        email: user.email
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRES_IN,
        issuer: 'bibliotheque-api',
        audience: 'bibliotheque-app'
      }
    );

    res.json({
      status: 'success',
      message: 'Connexion réussie',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la connexion'
    });
  }
});


const auth = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const User = require('./models/User');
    
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Token d\'authentification manquant'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'bibliotheque-api',
      audience: 'bibliotheque-app'
    });

    const user = await User.findById(decoded.sub);

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Utilisateur non trouvé'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token expiré'
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'error',
        message: 'Token invalide'
      });
    }
    return res.status(401).json({
      status: 'error',
      message: 'Erreur d\'authentification'
    });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      status: 'error',
      message: 'Accès réservé aux administrateurs'
    });
  }
  next();
};


app.get('/api/books', async (req, res) => {
  try {
    const Book = require('./models/Book');
    
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 10);
    const skip = (page - 1) * limit;

    let query = {};
    
    if (req.query.genre) query.genre = req.query.genre;
    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    const [books, total] = await Promise.all([
      Book.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Book.countDocuments(query)
    ]);

    res.json({
      status: 'success',
      data: {
        books,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Get books error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération des livres'
    });
  }
});

app.post('/api/books', auth, requireAdmin, async (req, res) => {
  try {
    const Book = require('./models/Book');
    
    const { title, author, isbn, genre, publicationYear, publisher, pages, summary } = req.body;

    if (!title || !author || !isbn || !genre || !publicationYear || !publisher || !pages) {
      return res.status(422).json({
        status: 'error',
        message: 'Tous les champs obligatoires doivent être remplis'
      });
    }

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      isbn: isbn.trim(),
      genre,
      publicationYear: parseInt(publicationYear),
      publisher: publisher.trim(),
      pages: parseInt(pages),
      summary: summary || '',
      available: true
    });

    res.status(201).json({
      status: 'success',
      message: 'Livre créé avec succès',
      data: { book }
    });
  } catch (error) {
    console.error('❌ Create book error:', error);
    
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'error',
        message: 'Un livre avec cet ISBN existe déjà'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la création du livre'
    });
  }
});


app.get('/api/profile', auth, async (req, res) => {
  try {
    res.json({
      status: 'success',
      data: {
        user: {
          id: req.user._id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
          createdAt: req.user.createdAt
        }
      }
    });
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Erreur lors de la récupération du profil'
    });
  }
});


app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route non trouvée'
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  
  const message = process.env.NODE_ENV === 'production' 
    ? 'Erreur interne du serveur' 
    : err.message;

  res.status(500).json({
    status: 'error',
    message
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Serveur sécurisé démarré sur le port ${PORT}`);
  console.log(`API Bibliothèque disponible: http://localhost:${PORT}/api`);
  console.log(`MongoDB connecté`);
  console.log(`Sécurité activée:`);
  console.log(`JWT Authentication`);
  console.log(`bcrypt Password Hashing`);
  console.log(`CORS Protection`);
  console.log(`Rate Limiting`);
  console.log(` Helmet Security Headers`);
});