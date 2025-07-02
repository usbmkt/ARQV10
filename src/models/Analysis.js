const { supabase } = require('../config/database');

class Analysis {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.segmento = data.segmento;
    this.contexto_adicional = data.contexto_adicional;
    this.resultado = data.resultado;
    this.metadata = data.metadata;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Buscar análise por ID
  static async findById(id, userId = null) {
    try {
      let query = supabase
        .from('analyses')
        .select('*')
        .eq('id', id);

      // Se userId fornecido, filtrar por usuário
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Análise não encontrada
        }
        throw error;
      }

      return new Analysis(data);
    } catch (error) {
      console.error('Erro ao buscar análise por ID:', error);
      throw error;
    }
  }

  // Buscar análises por usuário
  static async findByUserId(userId, options = {}) {
    try {
      const { page = 1, limit = 10, orderBy = 'created_at', order = 'desc' } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('analyses')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);

      // Ordenação
      query = query.order(orderBy, { ascending: order === 'asc' });

      // Paginação
      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        analyses: data.map(item => new Analysis(item)),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar análises por usuário:', error);
      throw error;
    }
  }

  // Buscar análises por segmento
  static async findBySegmento(segmento, userId = null, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('analyses')
        .select('*', { count: 'exact' })
        .ilike('segmento', `%${segmento}%`);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return {
        analyses: data.map(item => new Analysis(item)),
        pagination: {
          page,
          limit,
          total: count,
          totalPages: Math.ceil(count / limit)
        }
      };
    } catch (error) {
      console.error('Erro ao buscar análises por segmento:', error);
      throw error;
    }
  }

  // Criar nova análise
  static async create(analysisData) {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .insert({
          user_id: analysisData.user_id,
          segmento: analysisData.segmento,
          contexto_adicional: analysisData.contexto_adicional || null,
          resultado: analysisData.resultado,
          metadata: analysisData.metadata || {},
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return new Analysis(data);
    } catch (error) {
      console.error('Erro ao criar análise:', error);
      throw error;
    }
  }

  // Atualizar análise
  async update(updateData) {
    try {
      const { data, error } = await supabase
        .from('analyses')
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
      console.error('Erro ao atualizar análise:', error);
      throw error;
    }
  }

  // Deletar análise
  async delete() {
    try {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', this.id);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Erro ao deletar análise:', error);
      throw error;
    }
  }

  // Buscar análises relacionadas (mesmo segmento)
  async getRelated(limit = 5) {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('id, segmento, created_at')
        .ilike('segmento', `%${this.segmento}%`)
        .neq('id', this.id)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data.map(item => new Analysis(item));
    } catch (error) {
      console.error('Erro ao buscar análises relacionadas:', error);
      throw error;
    }
  }

  // Estatísticas gerais
  static async getStats() {
    try {
      // Total de análises
      const { count: totalAnalyses } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true });

      // Análises hoje
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: today_count } = await supabase
        .from('analyses')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      // Segmentos mais populares
      const { data: allAnalyses } = await supabase
        .from('analyses')
        .select('segmento');

      const segmentCounts = {};
      allAnalyses?.forEach(analysis => {
        segmentCounts[analysis.segmento] = (segmentCounts[analysis.segmento] || 0) + 1;
      });

      const topSegments = Object.entries(segmentCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([segmento, count]) => ({ segmento, count }));

      return {
        totalAnalyses: totalAnalyses || 0,
        todayAnalyses: today_count || 0,
        topSegments
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas gerais:', error);
      throw error;
    }
  }

  // Buscar análises recentes
  static async getRecent(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('id, segmento, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data.map(item => new Analysis(item));
    } catch (error) {
      console.error('Erro ao buscar análises recentes:', error);
      throw error;
    }
  }

  // Converter para JSON
  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      segmento: this.segmento,
      contexto_adicional: this.contexto_adicional,
      resultado: this.resultado,
      metadata: this.metadata,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Converter para JSON público (sem dados sensíveis)
  toPublicJSON() {
    return {
      id: this.id,
      segmento: this.segmento,
      created_at: this.created_at,
      metadata: {
        model: this.metadata?.model,
        processingTimeMs: this.metadata?.processingTimeMs
      }
    };
  }

  // Verificar se análise é válida
  isValid() {
    return !!(this.id && this.user_id && this.segmento && this.resultado);
  }

  // Verificar se pertence ao usuário
  belongsToUser(userId) {
    return this.user_id === userId;
  }
}

module.exports = Analysis;

