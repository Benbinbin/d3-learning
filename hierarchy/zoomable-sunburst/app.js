d3.json('data.json').then(data => {
  /**
  * ---结构化数据---
  * d3.hierarchy()
  */
  const root = d3.hierarchy(data)
    .sum(d => d.value) // !!! 在将结构化数据传递给 d3.partition() 之前必须调用 sum() 方法，以计算每个节点的后代节点累计值，这样 d3.partition() 才可以基于该值得出节点的区域大小
    .sort((a, b) => b.value - a.value); // 可选，对同级节点进行排序

  /**
  * ---预设参数---
  */
  // 构建 svg 相关元素的容器
  const width = document.documentElement.clientWidth; // <svg> 元素的固定宽度
  const height = document.documentElement.clientHeight // <svg> 元素的固定高度
  // 创建 svg 元素，设置合适的视窗 viewBox 大小
  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])

  const container = svg.append('g')
    .attr('class', 'container')
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // console.log(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

  /**
   * ---计算分区层次布局---
   * d3.tree()
   */
  // 使用 d3.partition 模块用来生成邻接图（一个树图的变体），与使用线条链接父子节点不同，节点的层次关系以空间定位（邻近）表示相对关系，此外节点被编码为一个可度量的维度，可以更精确地比较节点之间的数据量。
  // 在这个布局中节点会被绘制为一个区域(可以是环形区域也可以是矩形区域)以表示该节点包含的数据量，父子节点的区域依次紧邻着，表示在层次结构中的相对关系。
  const tree = d3.partition()
    .size([2 * Math.PI, root.height + 1])(root); // 旭日图是环形，采用角度坐标 [360, radius]
  // !!!样例使用节点层次数（包括根节点）作为半径，计算得到的坐标中半径是比例（非绝对坐标），所以这些数据传递给 d3.arc() 生成环形时，需要将 d.y0 和 d.y1 乘上 radius 才是真实的绝对坐标
  // 对指定的结构数据计算分区层次布局，每个节点会被附加以下属性:
  // node.x0 - 环形的左边的偏移角度
  // node.y0 - 环形的内边缘
  // node.x1 - 环形的右边的偏移角度
  // node.y1 - 环形的外边缘
  // 由于使用树的层次深度 root.height 作为相对 radius，所以得到的节点的 y0 和 y1 是正整数且表示节点所在的层次，例如根节点的 root.y0 = 0，root.y1 = 1；而其直接子节点都是 node.y0 = 1，node.y1 = 2

  // !!!为每个节点添加 current 属性，「拷贝」初次计算得到的相对坐标信息，作为各节点对应环形的初始定位，后续会修改 d.current 中个坐标的值，用于生成补间动画，而原始数据 {d.x0, d.x1, d.y0, d.y1} 作为各节点不变的信息
  tree.each(d => {
    d.current = {
      x0: d.x0,
      x1: d.x1,
      y0: d.y0,
      y1: d.y1
    };
  });

  // 设置径向树布局参数
  const radius = width > height ? height / (root.height + 2) : width / (root.height + 2); // 该参数并不是径向图的实际半径大小，而是环形的宽度（用以与相对坐标相乘，得到绝对坐标）

  /**
   * ---绘制旭日图---
   */

  /**
   * 外圆环
   */
  // 使用 d3.shape 模块的 arc() 方法基于以下数据（乘上环形宽度转换为绝对坐标）生成环形
  // node.x0 - 环形的左边的偏移角度
  // node.y0 - 环形的内边缘
  // node.x1 - 环形的右边的偏移角度
  // node.y1 - 环形的外边缘
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    // 设置同层级的环形之间的间隔 padAngle * padRadius，然后每个环形就会减去整个间隔距离，从而产生同层相邻环形之间间隙
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005)) // 设置同层环形之间的间隙角度，如果直接设置为常量，会让图形显得「不成比例」，应该基于环形大小按比例设置其两侧的间隙
    // 该样例取 (d.x1 - d.x0) / 2 弧度值和 0.005 之间较小的那个值作为间隔角度，可以基于环形大小按比例设置同时避免间隔过大
    .padRadius(radius) // 设置同层环形之间的间隙宽度，默认是环形内外半径的平方和的算术平方根。样例设置为定量
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1)) // 适当地缩短外半径，让每一层环形之间有一定间隔

  // 控制是否显示环形的条件，半径（相对坐标）在 yo = 1（对应于 y1 = 2） 至 y1 = 3（即每次显示 2 层环形），角度 x1 > x0，因此显示
  function arcVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
  }
  // 控制是否显示文本的条件，类似环形的限制，同时避免环形区域过小显示文字
  function labelVisible(d) {
    return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
  }

  // 设置文本偏移，正确地定位到相应的环形中
  function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2 * radius;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  // 预设颜色数组
  // 使用 d3 scale-chromatic 模块的 interpolateRainbow() 方法作为颜色插值函数
  // 使用 d3 interpolate 模块的 quantize() 方法根据指定的 interpolator 插值函数，返回 n 个等间隔的均匀采样
  // 使用 d3 scale 模块的 scaleOrdinal() 方法创建一个序数比例尺，输出域是采样得到一系列颜色的数组，（输入域为空数组，待调用时（输入子节点的 name 属性值）再记录）然后使用该比例尺将不同的（根节点后的直接）子节点映射到不同的颜色
  const color = d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, data.children.length + 1));

  // 绘制环形，得到初始化位置，并为各个具有子树的节点添加点击事件
  const path = container.append("g")
    .attr('class', 'path')
    .selectAll("path")
    // 将数据与 <path> 元素进行绑定
    .data(tree.descendants().slice(1)) // 移除第一个节点，即根节点
    .join("path")
    .attr("fill", d => { while (d.depth > 1) d = d.parent; return color(d.data.name); }) // 不断循环回溯查看当前节点所属哪个根节点的直接子节点，并返回对应的颜色值
    .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0) // 使用方法 arcVisible() 判断是否「显示」节点对应的环形（将填充透明度设为 0 进行隐藏）；如果显示环形再深浅色来区分节点是否有子树
    .attr("d", d => arc(d)) // 使用函数 arc() 生成节点对应的环形路径

  // 为具有子树的节点设置鼠标悬浮样式，并添加点击事件
  path.filter(d => d.children)
    .style("cursor", "pointer")
    .on("click", clicked);

  // 绘制文本，得到初始化位置
  const label = container.append("g")
    .attr('class', 'label')
    .attr("text-anchor", "middle")
    .attr("pointer-events", "none")
    .style("user-select", "none") // 限制用户选择文本（让整个环形可点击）
    .selectAll("text")
    .data(tree.descendants().slice(1)) // 移除第一个节点，即根节点
    .join("text")
    .attr("dy", "0.25em")
    .attr("fill-opacity", d => +labelVisible(d)) // +labelVisible(d.current) 将布尔值转换为数值 0 或 1，控制是否显示文本
    .attr("transform", d => labelTransform(d))
    .text(d => d.data.name);

  /**
   * 中心圆环
   */
  // 设置旭日图中心区域交互，中心元素默认绑定根节点的数据
  // const parent = container.append("circle")
  //   .datum(tree)
  //   .attr("r", radius)
  //   .attr("fill", "#1E78FD")
  //   .attr("fill-opacity", 0.3)
  //   .style("cursor", "pointer")
  //   .on("click", clicked);

  // 旭日图中心区域
  // 使用 d3.shape 模块的 arc() 方法基于以下数据（乘上环形宽度转换为绝对坐标）生成多个（一圈完整的）环形
  function centerArc(node) {
    // node 是当前点击的节点，默认是根节点
    const nodes = node.ancestors();
    let centerRadius = radius / nodes.length; // 中心区域环形宽度

    const arc = d3.arc()
      .startAngle(0)
      .endAngle(2 * Math.PI)
      .innerRadius(d => d.y0 * centerRadius)
      .outerRadius(d => Math.max(d.y0 * centerRadius, d.y1 * centerRadius)) // 适当地缩短外半径，让每一层环形之间有一定间隔

    return arc
  }

  // 为中心圆环设置阴影滤镜
  svg.append("defs")
    .append("filter")
    .attr('id', "shadow")
    .append('feDropShadow')
    .attr('in', 'SourceGraphic')
    .attr('stdDeviation', '5 5')


  // 预设颜色数组
  function centerColor(node) {
    // node 是当前点击的节点，默认是根节点
    const nodes = node.ancestors(); // 获取点击节点的祖先节点数组（其中第一个节点为自身，然后依照最深至最浅的顺序列出节点）
    const color = d3.quantize(d3.interpolate("rgb(200, 200, 200)", "rgb(255, 255, 255)"), nodes.length + 1); // 在灰度色谱中采样，为各个中心环形上色，将节点的深度映射到灰度深浅
    console.log(color);
    return color
  }

  // console.log(d3.quantize(d3.interpolateGreys, 3));

  function centerLabelArc(node, d) {
    // node 是当前点击的节点，默认是根节点
    const nodes = node.ancestors();
    let centerRadius = radius / nodes.length; // 中心区域环形宽度

    const path = d3.path();
    if (d.parent) {
      // 对于其他节点（完整的圆环），字体对应的路径是曲线（位于环形中心）
      path.arc(0, 0, (d.y0 + d.y1) / 2 * centerRadius, -Math.PI, 0)
    } else {
      // 对于根节点（在中心，圆形形式），字体对应的路径是直线（位于圆心）
      path.moveTo(-centerRadius / 2, 0);
      path.lineTo(centerRadius / 2, 0)
    }

    return path
  }

  // 设置旭日图中心区域和交互
  const center = container.append('g')
    .attr('class', 'center')

  // 绘制中心圆环并绑定点击事件
  const centerPath = center.append("g")
    .attr('class', 'center-path')

  centerPath.selectAll("path")
    // 将数据与 <path> 元素进行绑定
    .data(tree.ancestors(), d => d.data.name) // 默认绑定的是根节点的祖先节点数组，该数组的元素只有根元素自身，因此中心初始为一个圆形
    .join("path")
    .attr("fill", 'rgb(255, 255, 255)')
    .style("cursor", "pointer")
    .attr("pointer-events", "all")
    .attr("d", d => centerArc(tree)(d)) // 默认以根节点为当前节点，使用函数 centerArc() 生成中心的环形路径
    // .attr('filter', 'url(#shadow)')
    .on("click", clicked);

  // 绘制中心圆环的文本
  const centerLabel = center.append("g")
    .attr('class', 'center-label')
    .attr("pointer-events", "none")
    .style("user-select", "none") // 限制用户选择文本（让整个环形可点击）

  centerLabel.selectAll("path")
    .data(tree.ancestors(), d => d.data.name) // 默认绑定的是根节点的祖先节点数组
    .join("path")
    // .style("stroke", "#AAAAAA")
    .attr("d", d => centerLabelArc(tree, d))
    .attr('id', d => d.data.name)

  centerLabel.selectAll('text')
    .data(tree.ancestors(), d => d.data.name) // 默认绑定的是根节点的祖先节点数组
    .join("text")
    .attr('dy', "0.25em")
    .attr("text-anchor", "middle")
    .attr("font-size", 16)
    .append("textPath")
    .attr("xlink:href", d => `#${d.data.name}`)
    .attr("startOffset", "50%")
    .text(d => d.data.name);


  /**
   * ---交互---
   */
  // 点击事件回调函数，接受事件 event 作为第一个参数，当前节点（元素）绑定的数据 datum 作为第二个参数
  function clicked(event, p) {
    // parent.datum(p.parent || tree); // 更新旭日图中心圆绑定的数据，绑定点击节点的父节点的数据（如果点击的节点已经是根节点就绑定根节点对应的数据，由于根节点 parent 为 null）

    const t = d3.transition().duration(500); // 设置过渡时间

    /**
     * 更新外圆环
     */
    // 基于点击的节点为参考标准，重新计算其他节点的定位
    tree.each(d => d.target = {
      // 基于点击的环形的角度为基本单位 p.x1 - p.x0，计算其他环形的左或右边的偏移角度相对值(由于占比（相对值）最大是 1 最小值是 0 ，所以添加了限制），最后再换算为弧度值，得到新环形（相对）坐标（基于点击环形为根节点）
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      // 基于点击的环形的角度为基本单位 p.x1 - p.x0，计算其他环形的右边的偏移角度相对值
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      // 计算其他环形相对于点击环形的层级关系（用于控制环形的「隐藏/显示」
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });

    // 更新环形位置和隐藏/显示（执行过渡，使用补间动画）
    // Transition the data on all arcs, even the ones that aren’t visible, so that if this transition is interrupted, entering arcs will start the next transition from the desired position.
    path.transition(t)
      // 为元素应用名为 changePath 的补间动画，返回的函数是自定义的过渡插值器 interpolator。
      // 在过渡开始时，为每一个选中的元素调用函数，并传递当前元素绑定的数据 d 以及索引 i，函数内部 this 指向当前 DOM 元素。返回的过渡插值器 interpolator 会在过渡中的每一帧进行调用，并传递当前 eased 时间 t, 通常情况下处于 [0, 1] 之间。
      .tween("changePath", d => {
        // console.log("d.current", d.current);
        // console.log("d.target", d.target);
        const i = d3.interpolate(d.current, d.target); // 使用 d3 interpolate 模块的 interpolate() 方法（实际调用 interpolateObject()) 基于开始 d.current 到终点 d.target 状态进行插值，得到一系列的 {x0, x1, y0, y1} 值，并赋值给 d.current，便于后续调用（在 .attrTween() 的自定义的过渡插值器 interpolator 中作为数据源）
        return t => d.current = i(t);
      })
      // 筛选出需要（原来显示）隐藏或（原来显示或隐藏）显示的节点，执行补间动画
      .filter(function (d) {
        return +this.getAttribute("fill-opacity") || arcVisible(d.target);
      })
      // 为元素的属性 fill-opacity 设置目标值，并使用内置的过度插值器分配 attribute tween 属性补间值。
      .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
      // 为元素的属性 d 分配 attribute tween 属性补间值（由于该属性是复杂的字符串，需要使用 .attrTween() 方法以使用自定义的过渡插值器 interpolator）。
      // 返回的函数会在过渡过程中的每一帧进行调用，并传入 eased 缓动时间 t, 通常情况下在 [0, 1] 范围内
      .attrTween("d", d => () => arc(d.current)); // 即在过渡动画的每一帧中，使用之前 .tween() 插值生成的 {x0, x1, y0, y1} 值重新计算节点对应的环形路径 d

    // 更新文本位置和隐藏/显示（执行线性过渡）
    label.filter(function (d) {
      return +this.getAttribute("fill-opacity") || labelVisible(d.target); // 筛选出需要（原来显示）隐藏或（原来显示或隐藏）显示的节点，执行补间动画
    })
      .transition(t)
      .attr("fill-opacity", d => +labelVisible(d.target))
      .attrTween("transform", d => () => labelTransform(d.current));



    /**
     * 更新中心环形
     */
    // console.log(p);
    // console.log(p.ancestors());

    // 更新中心环形
    centerPath.selectAll('path')
      .data(p.ancestors(), d => d.data.name) // 更新绑定的数据
      .join("path")
      .attr("fill", (d, i) => {
        if (!d.parent) {
          // 设置为根节点为白色
          return 'rgb(255, 255, 255)'
        } else {
          // console.log(centerColor(p)[i]);
          return centerColor(p)[i]
        }
      })
      .style("cursor", "pointer")
      .attr("pointer-events", "all")
      .attr("d", d => centerArc(p)(d))
      .on("click", clicked)
      .attr('filter', d => {
        if(p===d) return
        return 'url(#shadow)'
      })

    // 更新中心圆环的文本
    // 更新文本弧形路径
    centerLabel.selectAll('path')
      .data(p.ancestors(), d => d.data.name) // 更新绑定的数据
      .join("path")
      .attr('fill', 'none')
      // .style("stroke", "#AAAAAA")
      .attr("d", d => centerLabelArc(p, d))
      .attr('id', d => d.data.name)

    // 更新文本
    const text = centerLabel.selectAll('text')
      .data(p.ancestors(), d => d.data.name) // 更新绑定的数据

    text.enter()
      .append('text')
      .attr('dy', "0.25em")
      .attr("text-anchor", "middle")
      .attr("font-size", 16)
      .append("textPath")
      .attr("xlink:href", d => `#${d.data.name}`)
      .attr("startOffset", "50%")
      .text(d => d.data.name);

    text.exit().remove();
  }

  // 将创建的 <svg> 元素挂载到页面上
  d3.select("body").append(() => svg.node())

});