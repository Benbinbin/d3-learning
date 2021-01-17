// 设置布局的节点尺寸，由于渲染的是水平布局树图，在设置坐标或宽高是部分函数在传递参数值时可能需要对调

/**
 * 读取数据
 * d3.json()
 */
d3.json('./data.json').then(data => {
  /**
   * 结构化数据
   * d3.hierarchy()
   */
  let root = d3.hierarchy(data);

  // !!!这一步修改树的结构，因此初始化的树并不是一棵完整的树
  root.descendants().forEach((d, i) => {
    d.id = i; // 将数列的索引设置为节点的 id 属性，作为各节点添加唯一标识值，在后面将节点数据与 DOM 元素绑定时，作为 key 函数的返回值
    d._children = d.children; // 将每个节点的子树（如果有）存放到属性 _children 中，然后选择性地将 children 属性为 null 来实现子树的隐藏（但仍保留该属性，以区分是否为叶子节点）
    // !!!由于 d.children 是对象，所以复制操作实际是引用，因此后面对子树展开后，也会影响到 d._children
    if (d.depth >= 1) d.children = null; // 为了演示，当节点不是根节点，且节点文本长度不为 7 时，隐藏其子树
  });
  console.log(root);

  /**
   * 预设参数和构建 svg 相关元素的容器
   */
  // const width = document.documentElement.clientWidth; // <svg> 元素的固定宽度
  // const height = document.documentElement.clientHeight * 0.3;
  const width = 800; // <svg> 元素的固定宽度
  const height = 600;

  // 设置树布局的节点尺寸
  const dx = 20; // 固定垂直宽度
  const dy = width / 4; // 固定水平宽度，基于 svg 宽度计算得到

  // 创建 svg 元素，设置合适的视窗 viewBox 大小
  const svg = d3.create("svg")
    .attr("viewBox", [-2 * dy, -height / 2, width, height]) // 设置水平和垂直偏移量，让树居中显示
    .style("font", "14px sans-serif")

  // 所有树图元素的容器 <g>
  const container = svg.append("g")
    .attr("class", "container")
  // .attr('transform', `translate(${2 * dy}, ${height / 2})`)

  svg.append('circle')
    .attr('cx', 0)
    .attr('cy', 0)
    .attr('r', 5)
    .attr('fill', 'red')

  // 创建节点间连线的容器 <g>，并设置线条的样式
  const gLink = container.append("g")
    .attr("fill", "none")
    .attr("stroke", "#555")
    .attr("stroke-opacity", 0.4)
    .attr("stroke-width", 1.5);

  // 创建节点间连线的容器 <g>，并设置鼠标悬浮时的样式
  const gNode = container.append("g")
    .attr("cursor", "pointer")
    .attr("pointer-events", "all");

  /**
   * 响应用户操作（点击节点展开或搜索子树），重新计算数据的层次布局并渲染树图
   * 封装为一个函数便于不断调用（递归调用）
   */
  function update(source, duration = 250) {
    const nodes = root.descendants(); // 返回包含树中所有节点的数组，并进行倒序?
    const links = root.links(); // 返回包含树中所有的节点配对关系的数组
    /**
    * 计算修改后的 root 的层次布局
    * d3.tree()
    */
    // nodeSize([width, height]) 参数设定与垂直树相反
    d3.tree().nodeSize([dx, dy])(root);
    // 先序遍历当前树的所有节点，并为各个节点（主要是为新增的节点）都设置 x0、y0 属性，当节点作为 source 时其子树「伸缩」的定位, 例如根节点的坐标 (0, 0) 是初始化生成树时动效的起点
    root.eachBefore(d => {
      d.x0 = d.x;
      d.y0 = d.y;
    });

    /**
    * 绘制可交互树图
    */

    /**
     * 更新节点
     */
    // 将节点数据绑定到 gNode 容器里的 <g> 元素上 ，获得 entering 结点集合（生成虚拟的数据占位元素）
    const node = gNode.selectAll("g")
      .data(nodes, d => d.id); // 使用 key 函数，为元素和数据设置唯一标识，便于元素的重用

    // 将数据占位元素挂载到 gNode 容器里
    const nodeEnter = node.enter().append("g")
      .attr("transform", d => `translate(${source.y0},${source.x0})`) // 新增节点的初始位置设置为 source 所在的位置（例如初始化第一次执行 update 函数时，source 位置就是前面在 root 根节点中硬编码的设置的 x0、y0 值，即该点就是树的起点）
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0)



    // 为带有 children 属性的节点绑定点击事件，当用户点击节点时，切换 children 属性值（在 null 和预先设置的 _children 之间切换）
    // !!!这会改变树的数据结构
    const hasChildrenNode = nodeEnter.filter((d) => {
      return d.data.children
    });

    hasChildrenNode.on("click", (event, d) => {
      // console.log(event.altKey);
      duration = event.altKey ? 1000 : 250; // 预设动画持续时间是 250ms，当按住 alt 键点击节点，动画持续更长时间
      // 切换 children 属性值（在 null 和预先设置的 _children 之间切换）
      d.children = d.children ? null : d._children;
      update(d, duration); // 然后调用 update() 函数，传递当前点击的节点作为 source，因此新增或移除的节点的「伸缩」起点或终点就是父节点

      let isRoot = d.parent ? false : true;// 判断 d 是否为 root;
      if (d.children && !isRoot) {
        // 展开子树的情况
        d.parent.children.forEach(item => {
          if (item !== d) {
            // 判断是否为非点击节点，收起同层其他节点下的子树
            item.children = null;
            update(item, duration)
          }
        })
        adjustZoom(d, isRoot, true)
      } else if (d.children && isRoot) {
        // 根节点展开子树的情况
        adjustZoom(d, isRoot, true)
      } else if (!d.children) {
        // 收缩子树的情况
        adjustZoom(d, isRoot, false)
      }


    });

    // console.log(hasChildrenNode);

    // 为新增的节点添加圆形图标和文本
    nodeEnter.append("circle")
      .attr("r", 2.5)
      .attr("fill", d => d._children ? "#555" : "#999") // 判断是否有子节点，如果有就用深色 #555，否则用浅色 #999
      .attr("stroke-width", 10);

    nodeEnter.append("text")
      .attr("dy", "0.25em")
      .attr("x", d => d._children ? -6 : 6) // 如果是有子节点，文本向左偏移，否则向右偏移
      .attr("text-anchor", d => d._children ? "end" : "start") // 如果是有子节点，文本向左伸展，否则文本向右伸展
      .text(d => d.data.name)
      // 克隆文本为了添加白底和描边。使用 d3.selection 模块的 clone() 方法在所选元素之后插入所选元素的克隆（参数 true 表示采用深度拷贝，将 <text> 元素包裹的文本节点也复制），然后再用 lower() 方法将该插入的克隆移到父元素的顶部，作为第一个子元素（根据 svg 元素渲染顺序，作为「衬底」
      .clone(true).lower()
      .attr("stroke-linejoin", "round")
      .attr("stroke-width", 3)
      .attr("stroke", "white");

    // 将新增的节点移到层次布局计算得到的坐标上，使用前面预设的动效（同时响应式变更 svg 的 viewBox 高度）
    node.merge(nodeEnter)
      .transition()
      .duration(duration)
      .attr("transform", d => `translate(${d.y},${d.x})`)
      .attr("fill-opacity", 1)
      .attr("stroke-opacity", 1);

    // 从页面上移除 exiting 结点集合（未绑定数据的旧 DOM 元素），使用前面预设的动效，节点缩回父节点处
    node.exit()
      .transition()
      .duration(duration)
      .remove()
      .attr("transform", d => `translate(${source.y},${source.x})`)
      .attr("fill-opacity", 0)
      .attr("stroke-opacity", 0);

    /**
    * 更新连线
    */
    // 将连线数据绑定到 gLink 容器里的 <path> 元素上 ，获得 entering 结点集合（生成虚拟的数据占位元素）
    const link = gLink.selectAll("path")
      .data(links, d => d.target.id); // 使用 key 函数，以数据的终点节点的 id 属性作为元素的唯一标识，便于元素的重用

    // 将数据占位元素挂载到 gNode 容器里
    const linkEnter = link.enter().append("path")
      .attr("d", d => {
        const o = { x: source.x0, y: source.y0 };
        // 使用 d3.linkHorizontal() 方法生成曲线（源点到目标点的光滑的三次贝塞尔曲线），终点和起点处的切线是水平方向的
        // 将 o 传递给 link 生成器，将新增连线的初始起点和终点都指定为 source 所在的位置，因此一开始是不可见
        return d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x)
          ({ source: o, target: o }); // 由于树图是水平方向，需要调用 link 生成器的方法 .x() 调换 x 和 y 值
      });

    // 将新增的连线根据基于「真实」的节点位置重新生成曲线，使用前面预设的动效（同时响应式变更 svg 的 viewBox 高度）
    link.merge(linkEnter)
      .transition()
      .duration(duration)
      .attr("d", d3.linkHorizontal()
        .x(d => d.y)
        .y(d => d.x));

    // 从页面上移除 exiting 结点集合，使用前面预设的动效，节点缩回父节点处
    link.exit()
      .transition()
      .duration(duration)
      .remove()
      .attr("d", d => {
        const o = { x: source.x, y: source.y };
        return d3.linkHorizontal()
          .x(d => d.y)
          .y(d => d.x)
          ({ source: o, target: o });
      });

  }

  update(root);

  // 将创建的 <svg> 元素挂载到页面上
  // console.log(svg.node());
  d3.select("body").append(() => svg.node())

  /**
   * 拖动和缩放功能
   */
  /**
   * 响应用户主动缩放和拖移操作
   */
  const zoom = d3.zoom()
    .scaleExtent([0.5, 10]) // 设置缩放范围最小是原始大小，最大是 40 倍
    // 监听缩放事件（d3 将鼠标滚动和鼠标拖移、触控双指捏合、触控单指移动等多种事件整合，而且分为三种阶段：start、zoom、end。可以针对缩放事件的特定阶段进行监听）
    .on("zoom", zoomHandler) // 默认将事件 event 对象作为参数传入


  // 如果需要针对特定的缩放操作作出特定的响应，可以在之后设置特定的事件侦听，如 on("dblclick.zoom", null) 取消双击事件的侦听（默认双击放大）

  // zoom 事件的回调函数，对 <g class="container"> 元素进行缩放和拖移变换
  // 其中变换参数在事件 event 对象的 transform 属性中，它是一个对象，包含了当前的缩放变换信息（x、y、k）
  function zoomHandler(event) {
    // console.log(event);
    let { x, y, k } = event.transform
    // 解构事件 event 获取 transform 参数
    // 通过 CSS 将变换应用到 HTML 元素
    // 注意变换的顺序，平移一定要在缩放前
    // 直接将 transform 对象作为属性值，它会调用其方法.toString() 返回一个能直接被 SVG transform 识别的表示变换的字符串
    // container.attr("transform", transform);
    // if(type === 'mousemove') {
    //   container.attr("transform", `translate(${x}, ${y} scale(${k})`);
    // } else if( type === 'wheel') {

    //   container.attr("transform", `translate(${x}, ${y}) scale(${k})`)
    // }
    container.attr("transform", `translate(${x}, ${y}) scale(${k})`);
  }

  // 一般将 zoom 事件侦听添加到整个 <svg> 元素上，然后对内部的 <g> 元素进行缩放和拖移操作（更新 transform 状态），这样避免可能发生抖动的情况。
  // 所以 DOM 一般采用 <svg><g class="container"></g></svg> 结构
  // 使用 selection.call(zoom) 为特定的选择集应用预设的缩放行为
  svg.call(zoom)

  /**
   * 「伸缩」子树时调整画面布局
   */
  // 获取最多的子节点数
  // 以上 svg.call(zoom) 使用监听用户触发的 zoom 事件默认直接生成的 event.transform 来执行变换，此外还可以使用 zoom.transform 函数来设置自定义的变换方式，覆盖替换 event.transform 的值，再传递给回调函数，对 <g class="container"> 元素执行指定的变换
  function adjustZoom(d, isRoot, isExpand) {
    /**
    * 点击节点如果展开子树，则节点移动到垂直居中位置
    * 点击节点如果收缩节点，其上一级父节点移动到垂直居中位置
    */
    let scale = 1;
    let x, y;
    if (isExpand) {
      // 展开子树
      scale = height / ((d.children.length + 2) * dx); // 基于子树的节点个数相应地缩放容器 <g class="container">
      x = d.y;
      y = d.x;
    } else if (!isRoot && !isExpand) {
      //  收缩子树
      scale = height / ((d.parent.children.length + 2) * dx); // 基于同层的节点个数相应地缩放容器 <g class="container">
      x = d.parent.y;
      y = d.parent.x;
    } else if (isRoot && !isExpand) {
      //  收缩根节点
      x = d.y;
      y = d.x;
    }

    if (scale >= 1) {
      scale = 1
    }

    svg.transition()
      .duration(250)
      .call(
        zoom.transform,
        d3.zoomIdentity.translate(-x, -y).scale(scale)
        // d3.zoomIdentity 表示坐标 [0, 0] 缩放为 1 的状态，因此基于该状态进行变换就可以恢复原始变换位置
      )
  }
  function scale(node) {
    let scale = 1;
    if (root.children) {
      node.children.forEach(d => {
        var tmpDepth = getDepth(d);
        if (tmpDepth > depth) {
          depth = tmpDepth;
        }
      });
    }
    return scale
  }

});