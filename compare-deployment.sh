#!/bin/bash

set +e
> compare-summary.txt

PROJECT_DIR="/opt/tristaciss"
TEMP_DIR="/tmp/deployment-compare"

mkdir -p $TEMP_DIR
echo "[LOG] 临时目录已创建: $TEMP_DIR"

# 获取运行中的服务
SERVICES=$(docker-compose ps --services)

for service in $SERVICES; do
    echo "[LOG] 开始比较服务: $service"
    
    CONTAINER_ID=$(docker-compose ps -q $service)
    
    if [[ "$service" == *"frontend"* ]]; then
        CONTAINER_PATH="/usr/share/nginx/html"
    else
        CONTAINER_PATH="/app"
    fi

    if [[ "$service" == *"frontend"* ]]; then
        SOURCE_DIR="$PROJECT_DIR/avatar-react/build"
        CONTAINER_PATH="/usr/share/nginx/html"
        SOURCE_PREFIX="/usr/share/nginx/html"
    else
        SOURCE_DIR="$PROJECT_DIR/api-server"
        CONTAINER_PATH="/app"
        SOURCE_PREFIX="/app"
    fi

    docker exec $CONTAINER_ID find $CONTAINER_PATH -type f \( -name "*.py" -o -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.conf" \) | sort > $TEMP_DIR/${service}-running.txt

    find $SOURCE_DIR -type f \( -name "*.py" -o -name "*.js" -o -name "*.html" -o -name "*.css" -o -name "*.json" -o -name "*.conf" \) | sed "s|$SOURCE_DIR|$SOURCE_PREFIX|" | sort > $TEMP_DIR/${service}-source.txt
    
    # 比较文件列表
    echo "文件列表差异:"
    diff -u $TEMP_DIR/${service}-running.txt $TEMP_DIR/${service}-source.txt || true
    
    # 比较文件内容
    while read -r file; do
        if [ -f "$SOURCE_DIR/${file#/app/}" ]; then
            docker exec $CONTAINER_ID cat "$file" > $TEMP_DIR/running-file
            cat "$SOURCE_DIR/${file#/app/}" > $TEMP_DIR/source-file
            if ! diff -q $TEMP_DIR/running-file $TEMP_DIR/source-file >/dev/null; then
                echo "差异文件: $file"
                diff -u $TEMP_DIR/running-file $TEMP_DIR/source-file >> compare-summary.txt
            fi
        fi
    done < $TEMP_DIR/${service}-running.txt
    echo "[LOG] $service 服务比较完成"
done



# 比较 nginx.conf 文件（宿主机与前端容器）
FRONTEND_CONTAINER=$(docker-compose ps -q frontend)
echo "[LOG] 开始比较 nginx.conf 文件"
if [ -n "$FRONTEND_CONTAINER" ]; then
    echo -e "\n==== nginx.conf 差异 ====" >> compare-summary.txt
    docker exec $FRONTEND_CONTAINER cat /etc/nginx/nginx.conf > $TEMP_DIR/nginx-running.conf
    cat /opt/tristaciss/nginx.conf > $TEMP_DIR/nginx-source.conf
    if ! diff -q $TEMP_DIR/nginx-running.conf $TEMP_DIR/nginx-source.conf >/dev/null; then
        diff -u $TEMP_DIR/nginx-running.conf $TEMP_DIR/nginx-source.conf >> compare-summary.txt
    else
        echo "nginx.conf 文件无差异" >> compare-summary.txt
    fi
    rm -f $TEMP_DIR/nginx-running.conf $TEMP_DIR/nginx-source.conf
    echo "[LOG] nginx.conf 比较完成"
else
    echo "未找到前端容器，无法比较 nginx.conf" >> compare-summary.txt
fi

rm -rf $TEMP_DIR
echo "比较完成"