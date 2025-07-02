const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { supabase } = require('../config/database');
const { validateUserRegistration, validateUserLogin } = require('../middleware/validation');

// POST /api/users/register - Registro de usuário
router.post('/register', validateUserRegistration, async (req, res) => {
  try {
    const { email, password, nome, empresa } = req.body;

    // Verificar se usuário já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Usuário já existe',
        message: 'Este email já está cadastrado'
      });
    }

    // Hash da senha
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Criar usuário no Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nome,
          empresa
        }
      }
    });

    if (authError) {
      console.error('Erro no Supabase Auth:', authError);
      return res.status(400).json({
        success: false,
        error: 'Erro ao criar usuário',
        message: authError.message
      });
    }

    // Salvar dados adicionais na tabela users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        email,
        nome,
        empresa,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (userError) {
      console.error('Erro ao salvar dados do usuário:', userError);
      // Tentar limpar o usuário do Auth se falhou ao salvar na tabela
      await supabase.auth.admin.deleteUser(authUser.user.id);
      
      return res.status(500).json({
        success: false,
        error: 'Erro ao salvar dados do usuário',
        message: 'Tente novamente'
      });
    }

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: userData.id,
          email: userData.email,
          nome: userData.nome,
          empresa: userData.empresa
        }
      },
      message: 'Usuário criado com sucesso. Verifique seu email para confirmar a conta.'
    });

  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Tente novamente'
    });
  }
});

// POST /api/users/login - Login de usuário
router.post('/login', validateUserLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Fazer login no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        success: false,
        error: 'Credenciais inválidas',
        message: 'Email ou senha incorretos'
      });
    }

    // Buscar dados adicionais do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, nome, empresa, created_at')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      console.error('Erro ao buscar dados do usuário:', userError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar dados do usuário',
        message: 'Tente novamente'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: userData,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
          expires_at: authData.session.expires_at
        }
      },
      message: 'Login realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: 'Tente novamente'
    });
  }
});

// POST /api/users/logout - Logout de usuário
router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      
      // Fazer logout no Supabase
      await supabase.auth.signOut();
    }

    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });

  } catch (error) {
    console.error('Erro no logout:', error);
    res.status(500).json({
      success: false,
      error: 'Erro no logout',
      message: error.message
    });
  }
});

// GET /api/users/profile - Perfil do usuário
router.get('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token de autorização necessário'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }

    // Buscar dados completos do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, nome, empresa, created_at')
      .eq('id', user.id)
      .single();

    if (userError) {
      console.error('Erro ao buscar perfil:', userError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao buscar perfil',
        message: userError.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: userData
      }
    });

  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// PUT /api/users/profile - Atualizar perfil
router.put('/profile', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: 'Token de autorização necessário'
      });
    }

    const token = authHeader.split(' ')[1];
    const { nome, empresa } = req.body;
    
    // Verificar token
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: 'Token inválido ou expirado'
      });
    }

    // Atualizar dados do usuário
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        nome,
        empresa,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError);
      return res.status(500).json({
        success: false,
        error: 'Erro ao atualizar perfil',
        message: updateError.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: updatedUser
      },
      message: 'Perfil atualizado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// POST /api/users/refresh-token - Renovar token
router.post('/refresh-token', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token necessário'
      });
    }

    // Renovar sessão
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token inválido',
        message: error.message
      });
    }

    res.status(200).json({
      success: true,
      data: {
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at
        }
      },
      message: 'Token renovado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

module.exports = router;

