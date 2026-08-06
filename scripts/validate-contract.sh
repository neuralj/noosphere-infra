#!/bin/bash
set -euo pipefail

# 认知契约校验脚本
# 校验 agents.md 和 goals.json 的认知完整性

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
VALIDATION_RULES="$REPO_ROOT/cognitive-alignment/validation-rules.json"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 校验结果
ERRORS=0
WARNINGS=0
INFO=0

log_error() {
    echo -e "${RED}✗ ERROR:${NC} $1"
    ((ERRORS++))
}

log_warning() {
    echo -e "${YELLOW}⚠ WARNING:${NC} $1"
    ((WARNINGS++))
}

log_info() {
    echo -e "${BLUE}ℹ INFO:${NC} $1"
    ((INFO++))
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# 校验 agents.md
validate_agents_md() {
    local agents_file="$1"
    
    if [ ! -f "$agents_file" ]; then
        log_error "agents.md 不存在: $agents_file"
        return 1
    fi
    
    echo ""
    echo "校验 agents.md: $agents_file"
    echo "================================"
    
    # 检查五层完整性
    local layers=("价值层" "规则层" "结构层" "概念层" "感知层")
    local missing_layers=()
    
    for layer in "${layers[@]}"; do
        if ! grep -q "【[0-9]】$layer" "$agents_file"; then
            missing_layers+=("$layer")
        fi
    done
    
    if [ ${#missing_layers[@]} -eq 0 ]; then
        log_success "五层认知架构完整"
    else
        log_error "缺失认知层: ${missing_layers[*]}"
    fi
    
    # 检查价值层必填内容
    local value_requirements=("核心定位" "不做什么" "优先级规则")
    for req in "${value_requirements[@]}"; do
        if grep -q "$req" "$agents_file"; then
            log_success "价值层包含: $req"
        else
            log_warning "价值层缺失: $req"
        fi
    done
    
    # 检查规则层必填内容
    local rule_requirements=("硬约束" "运行约束")
    for req in "${rule_requirements[@]}"; do
        if grep -q "$req" "$agents_file"; then
            log_success "规则层包含: $req"
        else
            log_warning "规则层缺失: $req"
        fi
    done
    
    # 检查元认知自检记录
    if grep -q "元认知自检记录" "$agents_file"; then
        log_success "包含元认知自检记录"
    else
        log_info "建议添加元认知自检记录"
    fi
    
    # 检查知识三层网络
    if grep -q "知识三层网络" "$agents_file"; then
        log_success "包含知识三层网络"
    else
        log_info "建议添加知识三层网络"
    fi
}

# 校验 goals.json
validate_goals_json() {
    local goals_file="$1"
    
    if [ ! -f "$goals_file" ]; then
        log_error "goals.json 不存在: $goals_file"
        return 1
    fi
    
    echo ""
    echo "校验 goals.json: $goals_file"
    echo "================================"
    
    # 检查 cognitive_contract 元数据
    if jq -e '.cognitive_contract' "$goals_file" > /dev/null 2>&1; then
        log_success "包含 cognitive_contract 元数据"
        
        # 检查必填字段
        local required_fields=("version" "agents_md_hash" "last_sync")
        for field in "${required_fields[@]}"; do
            if jq -e ".cognitive_contract.$field" "$goals_file" > /dev/null 2>&1; then
                log_success "cognitive_contract 包含: $field"
            else
                log_error "cognitive_contract 缺失: $field"
            fi
        done
    else
        log_error "缺失 cognitive_contract 元数据"
    fi
    
    # 检查 goal 的 cognitive_layer
    local goals_count=$(jq '.goals | length' "$goals_file")
    local goals_with_layer=$(jq '[.goals[] | select(.cognitive_layer != null)] | length' "$goals_file")
    
    if [ "$goals_count" -eq "$goals_with_layer" ]; then
        log_success "所有 goals 都关联了认知层级"
    else
        local missing=$((goals_count - goals_with_layer))
        log_warning "$missing 个 goals 未关联认知层级"
    fi
    
    # 检查 knowledge_network
    local goals_with_network=$(jq '[.goals[] | select(.knowledge_network != null)] | length' "$goals_file")
    
    if [ "$goals_count" -eq "$goals_with_network" ]; then
        log_success "所有 goals 都关联了知识网络"
    else
        local missing=$((goals_count - goals_with_network))
        log_info "$missing 个 goals 未关联知识网络（建议添加）"
    fi
}

# 计算认知对齐度
calculate_alignment_score() {
    local agents_file="$1"
    local goals_file="$2"
    
    local score=100
    
    # agents.md 五层完整性（每缺失一层扣 10 分）
    local layers=("价值层" "规则层" "结构层" "概念层" "感知层")
    for layer in "${layers[@]}"; do
        if ! grep -q "【[0-9]】$layer" "$agents_file" 2>/dev/null; then
            score=$((score - 10))
        fi
    done
    
    # goals.json cognitive_layer 关联（每个缺失扣 5 分）
    if [ -f "$goals_file" ]; then
        local goals_count=$(jq '.goals | length' "$goals_file" 2>/dev/null || echo 0)
        local goals_with_layer=$(jq '[.goals[] | select(.cognitive_layer != null)] | length' "$goals_file" 2>/dev/null || echo 0)
        
        if [ "$goals_count" -gt 0 ]; then
            local missing_ratio=$(( (goals_count - goals_with_layer) * 100 / goals_count ))
            score=$((score - missing_ratio / 5))
        fi
    fi
    
    # 确保分数在 0-100 之间
    if [ $score -lt 0 ]; then score=0; fi
    if [ $score -gt 100 ]; then score=100; fi
    
    echo $score
}

# 主函数
main() {
    echo "================================"
    echo "认知契约校验工具 v1.0.0"
    echo "================================"
    
    # 查找 agents.md
    local agents_file=""
    if [ -f "$REPO_ROOT/AGENTS.md" ]; then
        agents_file="$REPO_ROOT/AGENTS.md"
    elif [ -f "$REPO_ROOT/CLAUDE.md" ]; then
        agents_file="$REPO_ROOT/CLAUDE.md"
    else
        log_error "未找到 agents.md 或 CLAUDE.md"
    fi
    
    # 查找 goals.json
    local goals_file=""
    if [ -f "$REPO_ROOT/.opencode/goals.json" ]; then
        goals_file="$REPO_ROOT/.opencode/goals.json"
    else
        log_warning "未找到 .opencode/goals.json"
    fi
    
    # 执行校验
    if [ -n "$agents_file" ]; then
        validate_agents_md "$agents_file"
    fi
    
    if [ -n "$goals_file" ]; then
        validate_goals_json "$goals_file"
    fi
    
    # 计算对齐度
    if [ -n "$agents_file" ] && [ -n "$goals_file" ]; then
        local score=$(calculate_alignment_score "$agents_file" "$goals_file")
        
        echo ""
        echo "================================"
        echo "认知对齐度评分"
        echo "================================"
        
        if [ $score -ge 90 ]; then
            echo -e "${GREEN}评分: $score/100 (优秀)${NC}"
            echo "认知契约完整，可直接用于 AI 开发"
        elif [ $score -ge 70 ]; then
            echo -e "${YELLOW}评分: $score/100 (良好)${NC}"
            echo "认知契约基本完整，建议补充缺失部分"
        elif [ $score -ge 50 ]; then
            echo -e "${YELLOW}评分: $score/100 (需改进)${NC}"
            echo "认知契约存在较多缺失，需要重构"
        else
            echo -e "${RED}评分: $score/100 (不合格)${NC}"
            echo "认知契约严重缺失，必须重新编写"
        fi
    fi
    
    # 输出统计
    echo ""
    echo "================================"
    echo "校验统计"
    echo "================================"
    echo -e "错误: ${RED}$ERRORS${NC}"
    echo -e "警告: ${YELLOW}$WARNINGS${NC}"
    echo -e "信息: ${BLUE}$INFO${NC}"
    
    # 返回码
    if [ $ERRORS -gt 0 ]; then
        exit 1
    fi
    exit 0
}

main "$@"
