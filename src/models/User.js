const { supabase } = require('../config/database');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.nome = data.nome;
    this.empresa = data.empresa;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Buscar usuário por ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Usuário não encontrado
        }
        throw error;
      }

      return new User(data);
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }

  // Buscar usuário por email
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Usuário não encontrado
        }
        throw error;
      }

      return new User(data);
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }

  // Criar novo usuário
  static async create(userData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .insert({
          id: userData.id,
          email: userData.email,
          nome: userData.nome,
          empresa: userData.empresa || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new User(data);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      throw error;
    }
  }

  // Atualizar usuário
  async update(updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', this.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Atualizar propriedades da instância
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw error;
    }
  }

  // Deletar usuário
  async delete() {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', this.id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      throw error;
    }
  }

  // Buscar análises do usuário
  async getAnalyses(options = {}) {
    try {
      const { page = 1, limit = 10, orderBy = 'created_at', order = 'desc' } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('analyses')
        .select('*', { count: 'exact' })
        .eq('user_id', this.id);

      // Ordenação
      query = query.order(orderBy, { ascending: order === 'asc' });

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        analyses: data,
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar análises do usuário:', error);
      throw error;
    }
  }

  // Contar análises do usuário
  async countAnalyses() {
    try {
      const { count, error } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.id);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Erro ao contar análises:', error);
      throw error;
    }
  }

  // Buscar estatísticas do usuário
  async getStats() {
    try {
      // Total de análises
      const totalAnalyses = await this.countAnalyses();

      // Análises este mês
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: thisMonth } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', this.id)
        .gte('created_at', startOfMonth.toISOString());

      // Segmentos mais analisados
      const { data: analyses } = await supabase
        .from('analyses')
        .select('segmento')
        .eq('user_id', this.id);

      const segmentCounts = {};
      analyses?.forEach(analysis => {
        segmentCounts[analysis.segmento] = (segmentCounts[analysis.segmento] || 0) + 1;
      });

      const topSegments = Object.entries(segmentCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([segmento, count]) => ({ segmento, count }));

      return {
        totalAnalyses,
        thisMonth: thisMonth || 0,
        topSegments
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do usuário:', error);
      throw error;
    }
  }

  // Converter para JSON (remover dados sensíveis)
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      nome: this.nome,
      empresa: this.empresa,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Verificar se usuário é válido
  isValid() {
    return !!(this.id && this.email && this.nome);
  }
}

module.exports = User;

