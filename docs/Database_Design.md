# Digital Avatar 1.0.0 数据库设计方案

## 概述

基于前后端配置同步问题的分析，我们需要设计一个灵活可扩展的数据库架构来统一管理配置数据。

## 问题分析

### 当前问题
1. **前台配置**：保存在 localStorage，仅限浏览器本地
2. **后台配置**：从环境变量加载，重启后丢失前台设置
3. **数据隔离**：前后端配置存储完全分离，无法共享

### 解决方案
1. **临时方案**：使用 JSON 文件持久化配置（已实现）
2. **长期方案**：设计数据库架构统一管理

## 数据库设计原则

### 1. 灵活性原则
- 支持多种配置类型的动态扩展
- 配置项可以是简单值或复杂JSON对象
- 支持配置的版本管理和历史记录

### 2. 可扩展性原则
- 模块化设计，便于添加新功能
- 支持多租户架构
- 支持配置的分层管理（全局/用户/会话级别）

### 3. 安全性原则
- 敏感信息加密存储（如API密钥）
- 访问权限控制
- 审计日志记录

### 4. 性能原则
- 合理的索引设计
- 缓存机制
- 读写分离支持

## 核心表设计

### 1. 用户表 (users)
```sql
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_status (status)
);
```

### 2. 配置分类表 (config_categories)
```sql
CREATE TABLE config_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    parent_id INT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (parent_id) REFERENCES config_categories(id),
    INDEX idx_parent (parent_id),
    INDEX idx_sort (sort_order)
);
```

### 3. 配置模板表 (config_templates)
```sql
CREATE TABLE config_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    schema_json JSON NOT NULL, -- 配置项的JSON Schema
    default_values JSON, -- 默认值
    validation_rules JSON, -- 验证规则
    is_system BOOLEAN DEFAULT FALSE, -- 是否系统模板
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES config_categories(id),
    INDEX idx_category (category_id),
    INDEX idx_name (name),
    INDEX idx_system (is_system)
);
```

### 4. 用户配置表 (user_configs)
```sql
CREATE TABLE user_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    template_id INT NOT NULL,
    config_key VARCHAR(100) NOT NULL, -- 配置标识符
    config_name VARCHAR(200), -- 用户自定义名称
    config_values JSON NOT NULL, -- 配置值
    encrypted_fields JSON, -- 加密字段列表
    scope ENUM('global', 'session', 'temporary') DEFAULT 'global',
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL, -- 过期时间（用于临时配置）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES config_templates(id),
    UNIQUE KEY uk_user_template_key (user_id, template_id, config_key),
    INDEX idx_user (user_id),
    INDEX idx_template (template_id),
    INDEX idx_scope (scope),
    INDEX idx_active (is_active),
    INDEX idx_expires (expires_at)
);
```

### 5. 配置历史表 (config_history)
```sql
CREATE TABLE config_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    config_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    action ENUM('create', 'update', 'delete', 'activate', 'deactivate') NOT NULL,
    old_values JSON,
    new_values JSON,
    change_reason VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (config_id) REFERENCES user_configs(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_config (config_id),
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_created (created_at)
);
```

### 6. 系统配置表 (system_configs)
```sql
CREATE TABLE system_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSON NOT NULL,
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT FALSE, -- 是否可被前端访问
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_key (config_key),
    INDEX idx_public (is_public)
);
```

## Provider配置专用设计

### 7. AI Provider配置表 (ai_provider_configs)
```sql
CREATE TABLE ai_provider_configs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    provider_name VARCHAR(50) NOT NULL, -- openrouter, openai, deepseek
    provider_type ENUM('openrouter', 'openai', 'anthropic', 'custom') NOT NULL,
    display_name VARCHAR(100),
    api_key_encrypted TEXT NOT NULL, -- 加密存储的API密钥
    base_url VARCHAR(500),
    default_model VARCHAR(100),
    model_list JSON, -- 支持的模型列表
    rate_limits JSON, -- 速率限制配置
    features JSON, -- 支持的功能特性
    custom_headers JSON, -- 自定义请求头
    timeout_settings JSON, -- 超时配置
    retry_settings JSON, -- 重试配置
    is_enabled BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    priority INT DEFAULT 0, -- 优先级
    last_tested_at TIMESTAMP NULL,
    test_result JSON, -- 最后测试结果
    usage_stats JSON, -- 使用统计
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_provider (user_id, provider_name),
    INDEX idx_user (user_id),
    INDEX idx_provider (provider_name),
    INDEX idx_type (provider_type),
    INDEX idx_enabled (is_enabled),
    INDEX idx_default (is_default),
    INDEX idx_priority (priority)
);
```

## 数据库实现方案

### 阶段1：基础架构搭建
1. **数据库选择**：PostgreSQL（支持JSON字段，扩展性好）
2. **ORM框架**：SQLAlchemy（Python生态成熟）
3. **迁移工具**：Alembic（版本管理）
4. **连接池**：asyncpg（异步高性能）

### 阶段2：核心功能实现
1. **配置管理服务**：ConfigService
2. **加密服务**：EncryptionService
3. **缓存服务**：RedisCache
4. **审计服务**：AuditService

### 阶段3：高级功能
1. **配置同步**：前后端实时同步
2. **版本管理**：配置版本控制和回滚
3. **权限控制**：细粒度权限管理
4. **监控告警**：配置变更监控

## 迁移策略

### 从临时方案迁移
1. **数据导入**：从JSON文件导入现有配置
2. **兼容性**：保持现有API接口不变
3. **渐进式**：逐步替换存储后端
4. **回滚机制**：支持回退到文件存储

### 配置迁移脚本
```python
# migration_script.py
async def migrate_from_json_to_db():
    """从JSON配置文件迁移到数据库"""
    # 1. 读取现有JSON配置
    # 2. 创建用户记录
    # 3. 转换配置格式
    # 4. 插入数据库
    # 5. 验证迁移结果
    pass
```

## API设计

### RESTful API端点
```
GET    /api/v2/configs                    # 获取用户所有配置
POST   /api/v2/configs                    # 创建新配置
GET    /api/v2/configs/{id}               # 获取特定配置
PUT    /api/v2/configs/{id}               # 更新配置
DELETE /api/v2/configs/{id}               # 删除配置

GET    /api/v2/providers                  # 获取Provider配置列表
POST   /api/v2/providers                  # 创建Provider配置
PUT    /api/v2/providers/{name}           # 更新Provider配置
DELETE /api/v2/providers/{name}           # 删除Provider配置
POST   /api/v2/providers/{name}/test      # 测试Provider连接

GET    /api/v2/templates                  # 获取配置模板
GET    /api/v2/templates/{id}             # 获取特定模板
```

## 安全考虑

### 1. 数据加密
- API密钥使用AES-256加密
- 加密密钥从环境变量获取
- 支持密钥轮换

### 2. 访问控制
- JWT Token认证
- 基于角色的权限控制
- API速率限制

### 3. 审计日志
- 所有配置变更记录
- 用户操作追踪
- 异常访问告警

## 性能优化

### 1. 缓存策略
- Redis缓存热点配置
- 本地缓存Provider配置
- 缓存失效策略

### 2. 数据库优化
- 合理索引设计
- 分区表支持
- 读写分离

### 3. 连接优化
- 连接池管理
- 异步IO
- 批量操作

## 监控和运维

### 1. 监控指标
- 配置读写QPS
- 数据库连接数
- 缓存命中率
- API响应时间

### 2. 告警机制
- 数据库连接异常
- 配置同步失败
- 异常访问模式

### 3. 备份策略
- 定期数据备份
- 配置导出功能
- 灾难恢复方案

## 总结

这个数据库设计方案具备以下特点：

1. **灵活性**：支持多种配置类型和动态扩展
2. **可扩展性**：模块化设计，易于添加新功能
3. **安全性**：敏感数据加密，完整的权限控制
4. **性能**：合理的索引和缓存策略
5. **可维护性**：清晰的表结构和关系设计

通过这个设计，我们可以彻底解决前后端配置同步问题，并为未来的功能扩展奠定坚实基础。