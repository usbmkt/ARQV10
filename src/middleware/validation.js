const Joi = require('joi');

// Schema para validação de análise de mercado
const analysisSchema = Joi.object({
  segmento: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Segmento é obrigatório',
      'string.min': 'Segmento deve ter pelo menos 2 caracteres',
      'string.max': 'Segmento deve ter no máximo 100 caracteres',
      'any.required': 'Segmento é obrigatório'
    }),
  
  contexto_adicional: Joi.string()
    .max(2000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Contexto adicional deve ter no máximo 2000 caracteres'
    }),
  
  usuario_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'ID do usuário deve ser um UUID válido',
      'any.required': 'ID do usuário é obrigatório'
    })
});

// Schema para validação de registro de usuário
const userRegistrationSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório'
    }),
  
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
    .required()
    .messages({
      'string.min': 'Senha deve ter pelo menos 8 caracteres',
      'string.max': 'Senha deve ter no máximo 128 caracteres',
      'string.pattern.base': 'Senha deve conter pelo menos: 1 letra minúscula, 1 maiúscula, 1 número e 1 caractere especial',
      'any.required': 'Senha é obrigatória'
    }),
  
  nome: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Nome deve ter pelo menos 2 caracteres',
      'string.max': 'Nome deve ter no máximo 100 caracteres',
      'any.required': 'Nome é obrigatório'
    }),
  
  empresa: Joi.string()
    .max(100)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Nome da empresa deve ter no máximo 100 caracteres'
    })
});

// Schema para validação de login
const userLoginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Email deve ter um formato válido',
      'any.required': 'Email é obrigatório'
    }),
  
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Senha é obrigatória'
    })
});

// Middleware para validar requisição de análise
const validateAnalysisRequest = (req, res, next) => {
  const { error, value } = analysisSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Dados de entrada inválidos',
      details: errors
    });
  }

  req.body = value;
  next();
};

// Middleware para validar registro de usuário
const validateUserRegistration = (req, res, next) => {
  const { error, value } = userRegistrationSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Dados de registro inválidos',
      details: errors
    });
  }

  req.body = value;
  next();
};

// Middleware para validar login de usuário
const validateUserLogin = (req, res, next) => {
  const { error, value } = userLoginSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      error: 'Dados de login inválidos',
      details: errors
    });
  }

  req.body = value;
  next();
};

// Middleware genérico para validação
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: 'Dados inválidos',
        details: errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  validateAnalysisRequest,
  validateUserRegistration,
  validateUserLogin,
  validate,
  schemas: {
    analysisSchema,
    userRegistrationSchema,
    userLoginSchema
  }
};

