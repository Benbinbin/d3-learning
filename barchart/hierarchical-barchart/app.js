// 参考自 https://observablehq.com/@benbinbin/hierarchical-bar-chart
/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@benbinbin/zoomable-bar-chart 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/6fd9a8c38fa58544bf9f84f327ec2c6f/raw/b2f6962c7cd92427079b15af08a5a26d8e7c0893/flare-2.json";

d3.json(dataURL).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 处理数据
   *
   */
  // 通过方法 d3.hierarchy() 对数据进行处理，基于树形数据 data 计算层级结构
  // 构建出各层级的节点（并为节点添加相应的属性）
  root = d3
    .hierarchy(data)
    // node.sum() 方法为所有节点分别添加 node.value 属性
    // 该示例中 node.value 表示当前节点所在分支后的所有叶子节点所绑定的值的**累计值**
    // 具体作用可以参考官方文档 https://github.com/d3/d3-hierarchy#node_sum
    .sum((d) => d.value)
    // node.sort() 方法对同层级的节点进行排序
    // 这里是按照前面算到的各节点的累计值 node.value 进行降序 descending 排序
    // 具体作用可以参考官方文档 https://github.com/d3/d3-hierarchy#node_sort
    .sort((a, b) => b.value - a.value)
    // node.eachAfter(callback) 方法以后序遍历的顺序让节点均调用一次函数回调函数 callback
    // 该示例中（从叶子节点开始)为所有节点添加一个属性 index
    // 用于下钻时的动效过渡，作为同层级的节点的的唯一标识符，以便在过渡动效中实现柱子的堆叠和交错的效果
    // index 的值根据节点是否具有父节点 d.parent 来决定
    // 如果有父节点则将父节点的 index 值加一，同时将此时的父节点的 index 值作为该子节点的 index 值（如果父节点本来没有 index 值，则初始值为 0，所以此时所遍历的子节点的 index 也是 0）
    // 如果没有父节点（根节点）则它的 index 值为 0
    // 💡 因为是后序遍历，所以在遍历一个分支上的子节点时，所对应的那个「父节点」index 其实是作为一个「指针」，临时记录所遍历的当前的子节点的 index 值，让下一个所遍历的子节点可以根据前一个子节点的 index 值依次递增 1
    // 等到子节点遍历完成后，这个「父节点」和同层级的节点才会进入遍历，它的 index 值就会被重新设置，根据是否有父节点 parent 和在同级节点中的位置（遍历的顺序）来设置 index 的值
    .eachAfter((d) => {
      d.index = d.parent ? (d.parent.index = d.parent.index + 1 || 0) : 0;
    });

  // console.log(root);

  const barStep = 27; // 柱子的高度（带宽）
  const barPadding = 3 / barStep; // 每个相邻柱子之间的间隔系数（比例）
  const duration = 750; // 过渡动效的持续时间

  // 在 svg 四边留白，构建一个显示的安全区，以便在四周显示坐标轴
  const margin = { top: 30, right: 30, bottom: 0, left: 100 };

  /**
   *
   * 构建 svg
   *
   */
  const container = document.getElementById("container"); // 图像的容器

  // svg 的宽度
  const width = container.clientWidth; // 基于容器的宽度
  // svg 的高度
  // 基于树形数据中同层级**节点数量最多**的场景来设置高度值
  // 这样即使在数据下钻到最多节点的情况，条形图也可以显示完全的柱子
  // max 是在树形数据的同一个层级中最多的节点数量
  let max = 1; // 初始值
  // 使用 node.each() 方法以广度优先的顺序依次遍历所有节点，依次调用传入的回调函数
  // 最后 max 获取同一个层级中最多的节点数量
  root.each((d) => d.children && (max = Math.max(max, d.children.length)));
  // max 最大值是 32
  // 从根节点到该最多子节点的路径：flare -> query -> methods
  const height = max * barStep + margin.top + margin.bottom; // 基于 max 计算出 svg 的高度值

  // 创建 svg
  // 在容器 <div id="container"> 元素内创建一个 SVG 元素
  // 返回一个选择集，只有 svg 一个元素
  const svg = d3
    .select("#container")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  /**
   *
   * 在画面中绘制条形图的柱子
   *
   */
  // 传入的参数依次是：
  // * svg 只包含一个 svg 元素的选择集
  // * down 柱子被点击后时调用的函数（数据下钻）
  // * d 基于哪个节点的子节点数据构建条形图的柱子，
  // 如果是在数据下钻时调用该函数，就传入被点击的柱子所对应/所绑定的节点
  // 如果是在返回上一级数据时调用该函数，就传入需要作为 svg 的背景 <rect> 元素所绑定的数据
  // * selector 新增的元素会放置在该选择器所命中的元素之前
  // svg 元素显示层叠遮挡与它们在 DOM 结构树中的顺序相关，可以通过调整元素的顺序避免被遮挡
  function bar(svg, down, d, selector) {
    // 在 svg 中添加一个 <g> 元素作为条形图中新增柱子的（大）容器
    // 而且该新增的元素会放置在 selector 选择器所匹配的元素之前
    const g = svg
      .insert("g", selector)
      .attr("class", "enter") // 为该容器添加上 enter 类名
      // 通过设置 CSS 的 transform 属性将容器移动到合适的位置
      // 距离上方的横坐标轴有一定的距离
      .attr("transform", `translate(0,${margin.top + barStep * barPadding})`);

    // 为每个柱子设置一个（小）容器，并绑定数据，以及设置点击事件监听器
    const bar = g
      .selectAll("g")
      // 将被点击的柱子所绑定的节点（数据）的子节点作为各新增柱子所绑定的数据
      .data(d.children)
      .join("g")
      // 根据所绑定的节点是否为叶子节点（没有子节点）来设置不同的鼠标指针样式
      .attr("cursor", (d) => (!d.children ? null : "pointer"))
      // 为各柱子添加点击事件监听器
      // 柱子被点击后调用 down() 函数，并传入 svg 和柱子所绑定的节点（数据）
      .on("click", (event, d) => down(svg, d));

    // 为各柱子设置标注信息
    bar
      .append("text")
      // 通过设置 (x, y) 属性设置文字元素的定位
      // 因为文字和每个柱子都是在同一个（小）容器内的
      // 所以这里的 (x, y) 设置的是（与容器的）相对定位，以便和矩形元素有一定的间隙
      .attr("x", margin.left - 6)
      .attr("y", (barStep * (1 - barPadding)) / 2)
      .text((d) => d.data.name) // 标注内容
      // 设置一些文字相关样式
      .attr("dy", ".35em")
      .attr("text-anchor", "end") // 文字对齐方式采用 end
      .style("font", "10px sans-serif");

    bar
      .append("rect")
      // 为各矩形元素设置相关的尺寸和定位属性
      // 设置矩形的横坐标，都是对齐到横轴的零点位置
      // 💡 这里设置的是矩形的最终定位，即各柱子矩形的左上角的 x 坐标是在零点位置
      // 不过在后面的 down 函数中紧接着再通过 CSS 的 transform 属性，为各新增柱子设置不同的横向偏移将它们堆叠起来
      .attr("x", x(0))
      // 没有设置矩形的纵坐标（相当于采用默认值 0），在过渡动效中才进行设置
      // 设置矩形柱子的横向长度
      // 下钻时是先基于旧的横坐标轴比例尺，所以在 down() 函数最后还要重新计算新增柱子的长度
      .attr("width", (d) => x(d.value) - x(0))
      .attr("height", barStep * (1 - barPadding)); // 设置矩形柱子的带宽

    return g; // 返回这个包含新增柱子的容器
  }

  /**
   *
   * 让柱子沿着横轴堆叠起来，形成一条矩形柱子
   *
   */
  // 入参 i 就是点击的柱子（容器）所绑定的（节点）数据里的 d.index 序号
  function stack(i) {
    // 作为 d.value 的累计值
    // 即当前的 value 值是前面已经遍历的矩形柱子元素所绑定的（节点）数据的 d.value 值的和
    let value = 0;
    // 最后返回一个函数，该函数才是选择集中的每个元素所调用的
    // 这是为了使用闭包，保留 value 变量，然后在遍历柱子矩形元素时，可以基于 value 变量计算出当前所遍历的柱子的横向偏移量 x(value) - x(0)
    // 不断增大的 value 变量可以让柱子产生不同的横向的偏移（是前面柱子长度的总和），让柱子不必重叠在一起，而是堆叠在一起
    // 而柱子在纵向偏移量是一样的，都是基于 i 算出的 barStep * i 即所有的新增的柱子与点击的柱子在同一水平线上
    return (d) => {
      const t = `translate(${x(value) - x(0)},${barStep * i})`;
      value += d.value;
      return t; // 该函数最后返回一个字符串，作为 CSS 的 transform 属性的值
    };
  }

  /**
   *
   * 让柱子沿着纵轴堆展开
   *
   */
  function stagger() {
    let value = 0;
    // 和 stack 方法一样，使用闭包，保留 value 变量，基于 value 变量计算出当前所遍历的柱子的横向偏移量 x(value) - x(0) 不断增大的 value 变量可以让柱子产生不同的偏移（是前面柱子长度的总和）
    // 而柱子在纵向的偏移量则是基于它们在选择集中的索引值 i 计算出来的
    // 这样可以让展开的柱子呈阶梯状
    return (d, i) => {
      const t = `translate(${x(value) - x(0)},${barStep * i})`;
      value += d.value;
      return t;
    };
  }

  /**
   *
   * 点击柱子时该函数会被调用，实现数据下钻
   *
   */
  // 传入的参数依次是：
  // * svg 只包含一个 svg 元素的选择集
  // * d 被点击的柱子所绑定的数据（节点），数据下钻后条形图所展示的就是该节点的子节点
  function down(svg, d) {
    // 如果该节点没有子节点或存过正在执行的过渡动效（即上一个过渡动效还没有执行结束）就直接返回，不执行余下的操作
    // 其中所使用的选择集的方法 selection.node() 会返回选择集第一个非空的元素，如果选择集为空则返回 null
    // 而方法 d3.active(node) 获取指定元素正在执行中的过渡管理器
    if (!d.children || d3.active(svg.node())) return;

    // 更新 svg 背景 <rect> 元素所绑定的数据
    // 将当前下钻（所点击）的节点对象作为数据绑定到 svg 背景上
    svg.select(".background").datum(d);

    // （在 svg 上）定义两个先后执行的过渡管理器
    const transition1 = svg.transition().duration(duration);
    // 可以使用 transition.transition() 方法对同一个选择集设置一系列依次执行的过渡动效
    // 第二个过渡管理器 transition2 会基于原有的过渡管理器创建一个新的过渡管理器，它所绑定的选择集相同，而且继承了原有过渡的名称、时间、缓动函数等配置
    // 而且（通过第二个过渡管理器所创建的）过渡会在通过前一个过渡管理器所创建的过渡**结束后**才会开始执行
    const transition2 = transition1.transition();

    /**
     * 移除条形图中原有的矩形柱子
     */
    // 为画面当前的条形图柱子的（大）容器 <g>（具有 enter 类名）添加 exit 类名标记
    // 表示当前条形图中的柱子都将会被移除
    const exit = svg.selectAll(".enter").attr("class", "exit");

    // 在容器中选择所有的矩形
    // 其中被点击的矩形柱子（并不做过渡动效）立即隐藏，因为数据下钻 enter 新增的 <rect> 元素会立即显示
    // 避免出现两个矩形元素重叠在一起
    exit
      .selectAll("rect")
      // 通过比对当前的矩形元素所绑定的数据（节点）p 和传入的数据（节点）d 来判断是否为点击的元素
      // 通过设置透明度为 0 立即隐藏被点击的柱子
      .attr("fill-opacity", (p) => (p === d ? 0 : null));

    // 然后为即将移除的柱子的（大）容器添加一个淡出的过渡动效，将透明度从 100% 变成 0
    // 使用过渡管理器 transition1 的配置，为该过程该过程创建一个过渡
    exit.transition(transition1).attr("fill-opacity", 0).remove(); // 最后再移除元素

    /**
     * 在条形图上添加新的矩形柱子
     */
    // 调用 bar 函数，在条形图中绘制出新的柱子
    // 传入的依次的参数依次是：
    // * svg 只包含一个 svg 元素的选择集
    // * down 作为新增柱子被点击后时调用的函数
    // * d 被点击的柱子所绑定的节点
    // 返回一个包含新增柱子的 <g> 容器
    // * .y-axis 作为选择器，新增的元素会放置在纵轴元素之前，这样就可以避免新增的柱子矩形元素遮挡纵轴
    const enter = bar(svg, down, d, ".y-axis").attr("fill-opacity", 0); // 先将容器透明度设置为 0
    // 但是这里并没有隐藏柱子矩形，只隐藏文字
    // 可以看该函数最后部分，新增的柱子矩形元素单独设置了透明度 100%，即它们会被立即添加到页面上

    // 然后为即将添加的柱子的（大）容器添加一个淡入的过渡动效
    // 使用过渡管理器 transition1 的配置，为容器创建一个过渡，将透明度从 100% 变成 0
    // 实际效果是让容器里的文字（柱子的标注信息）淡入
    enter.transition(transition1).attr("fill-opacity", 1);

    // 设置新增柱子（各小容器）的过渡动效
    enter
      .selectAll("g")
      // 先将新增的柱子沿着横轴堆叠起来，且在纵向与点击的柱子的位置一样
      // 需要注意选择集中的每个元素所调用的并不是 stack(d.index) 而是它所返回的函数
      // 返回的函数只接收了一个入参 d 即每个元素所绑定的数据
      .attr("transform", stack(d.index))
      // 然后沿着纵轴将其展开（使用过渡管理器 transition1 的配置，为该过程创建一个过渡）
      .transition(transition1)
      // 需要注意选择集中的每个元素所调用的并不是 stagger() 而是它所返回的函数
      // 返回的函数接收了两个入参 d（每个元素所绑定的数据）和 i（当前所遍历的元素在选择集中的索引值）
      .attr("transform", stagger());

    // 更新横坐标轴的定义域
    // 其上界采用（点击的节点的）子节点数据里的最大值
    x.domain([0, d3.max(d.children, (d) => d.value)]);

    // （采用新的定义域）重新绘制横坐标轴
    // 使用过渡管理器 transition2 的配置，为该过程创建一个过渡，让横坐标轴更新有一个顺滑的视觉动效
    // 所以这个过渡动效会在 transition1 完成后再执行
    svg.selectAll(".x-axis").transition(transition2).call(xAxis);

    // 将新增的呈阶梯状的柱子矩形（小容器）移回到纵坐标轴处
    // 通过调整各新增柱子（小容器）的 CSS 属性 transform，将横向偏移量改回为 0
    // 使用过渡管理器 transition2 的配置，为该过程创建一个过渡
    // 所以这个过渡动效会在 transition1 完成后再执行
    enter
      .selectAll("g")
      .transition(transition2)
      .attr("transform", (d, i) => `translate(0,${barStep * i})`);

    // 设置新增的柱子的颜色和长度
    enter
      .selectAll("rect")
      .attr("fill", color(true)) // 新增的柱子的颜色先全都设置为蓝色
      // 这里将新增的柱子的透明度设置为 100%
      // 所以在前面将包含新增柱子的（大）容器的的透明度设置为 0，而在这里则会被覆盖
      // 即新增的柱子实际上会立即添加到页面上并显示出来，没有应用到过渡动效，只对标注信息文字应用了淡入动效
      .attr("fill-opacity", 1)
      // 最后设置新增的柱子的颜色和长度
      // 使用过渡管理器 transition2 的配置，为该过程创建一个过渡
      // 所以这个过渡动效会在 transition1 完成后再执行
      .transition(transition2)
      // 新增的柱子会基于其所绑定的节点（数据）是否具有子节点来设置不同的颜色
      .attr("fill", (d) => color(!!d.children))
      .attr("width", (d) => x(d.value) - x(0)); // 基于新的横坐标轴比例尺，重新计算矩形的长度
  }

  /**
   *
   * 点击条形图的背景时该函数会被调用，返回上一级数据
   *
   */
  // 该过程和 down() 函数内的过程相反
  // 所以各可视元素更新顺序及其所采用的过渡顺序是相反的
  // 传入的参数依次是：
  // * svg 只包含一个 svg 元素的选择集
  // * d 是条形图背景元素 <rect> 所绑定的节点（数据）
  // 该节点是条形图当前显示的柱子所对应的节点的**父节点**
  function up(svg, d) {
    // 如果该节点没有父节点（即根节点）或条形图中还有未移除的柱子（相当于上一个过渡动效还没有执行结束）就直接返回，不执行余下的操作
    // 其中 selection.empty() 返回一个布尔值，以表示选择集是否为空，即其中不包含元素
    // 通过该该方法判断是否已经将需要移除的柱子（的容器）删除掉
    if (!d.parent || !svg.selectAll(".exit").empty()) return;
    // 其中可以使用 down() 函数的判断条件，通过方法 d3.active(node) 获取指定元素正在执行中的过渡管理器，更准确地判断当前是否存过正在执行的过渡动效
    // if (!d.parent || d3.active(svg.node())) return;

    // 更新 svg 背景 <rect> 元素所绑定的数据
    // 将原来所绑定的节点对象的父节点作为数据绑定到 svg 背景上
    svg.select(".background").datum(d.parent);

    // （在 svg 上）定义两个先后执行的过渡管理器
    const transition1 = svg.transition().duration(duration);
    // （通过第二个过渡管理器所创建的）过渡会在通过前一个过渡管理器所创建的过渡**结束后**才会开始执行
    const transition2 = transition1.transition();

    /**
     * 移除条形图中原有的矩形柱子
     */
    // 为画面当前的条形图柱子的（大）容器 <g>（具有 enter 类名）添加 exit 类名标记
    // 表示当前条形图中的柱子都将会被移除
    const exit = svg.selectAll(".enter").attr("class", "exit");

    // 更新横坐标轴的定义域
    // 其上界采用同级节点的 d.parent.children 数据里的最大值
    x.domain([0, d3.max(d.parent.children, (d) => d.value)]);

    // （采用新的定义域）重新绘制横坐标轴
    // 使用过渡管理器 transition1 的配置，为该过程创建一个过渡，让横坐标轴更新有一个顺滑的视觉动效
    svg.selectAll(".x-axis").transition(transition1).call(xAxis);

    // 调整即将要被移除的柱子的 CSS 的 transform 属性的值，为这些柱子设置不同的横向偏移，让它们呈阶梯状
    // 使用过渡管理器 transition1 的配置，为该过程创建一个过渡
    exit.selectAll("g").transition(transition1).attr("transform", stagger());

    // 采用新的横轴比例尺重新计算这些要移除的柱子的长度，而且将它们的颜色都变成蓝色
    // 使用过渡管理器 transition1 的配置，为该过程创建一个过渡
    // 所以该过渡和上一步的操作，让这些将要移除的柱子横向偏移呈阶梯状的过程同时进行
    exit
      .selectAll("rect")
      .transition(transition1)
      .attr("width", (d) => x(d.value) - x(0))
      .attr("fill", color(true));

    // 再退一步，让这些柱子堆叠在一起成为一条长的矩形，且在纵向与原来下钻时点击的柱子的位置一样
    // 调整即将要被移除的柱子的 CSS 的 transform 属性的值，让它们的纵向偏移都恢复为 0（在同一条水平线上）
    // 使用过渡管理器 transition2 的配置，为该过程创建一个过渡
    // 所以这个过渡动效会在 transition1 完成后再执行
    exit
      .selectAll("g")
      .transition(transition2)
      .attr("transform", stack(d.index));

    // 然后为即将移除的柱子的（大）容器添加一个淡出的过渡动效，将透明度从 100% 变成 0
    // 使用过渡管理器 transition2 的配置，为该过程该过程创建一个过渡
    exit.transition(transition2).attr("fill-opacity", 0).remove(); // 最后再移除元素

    /**
     * 在条形图上添加新的矩形柱子
     */
    // 调用 bar 函数，在条形图中绘制出新的柱子
    // 传入的依次的参数依次是：
    // * svg 只包含一个 svg 元素的选择集
    // * down 作为新增柱子被点击后时调用的函数
    // * d.parent 作为 svg 的背景 <rect> 元素所绑定的数据
    // 返回一个包含新增柱子的 <g> 容器
    // * .exit 作为选择器，新增的元素会放置在需要移除的柱子的（大）容器之前，这样就可以避免遮挡住移除柱子过程中的过渡动效
    const enter = bar(svg, down, d.parent, ".exit").attr("fill-opacity", 0); // 先将容器透明度设置为 0

    // 通过调整各新增柱子（小容器）的 CSS 属性 transform
    // 将新增的柱子沿纵轴分布好
    enter
      .selectAll("g")
      .attr("transform", (d, i) => `translate(0,${barStep * i})`); // barStep 是柱子的带宽

    // 然后将显示新增柱子的（大）容器透明度设置回 100% 将它们显示出来
    // 使用过渡管理器 transition2 的配置，为该过程创建一个淡入的过渡动效
    enter.transition(transition2).attr("fill-opacity", 1);

    // 设置新增的柱子的颜色
    // 并单独处理与之前点击下钻时处于同一位置的新增的柱子
    // Exiting nodes will obscure the parent bar, so hide it.
    // Transition entering rects to the new x-scale.
    // When the entering parent rect is done, make it visible!
    enter
      .selectAll("rect")
      // 新增的柱子会基于其所绑定的节点（数据）是否具有子节点来设置不同的颜色
      .attr("fill", (d) => color(!!d.children))
      // 因为在 transition2 过渡执行完成之前，即将移除的柱子还显示在页面
      // 所以这里将对应的新增柱子的透明度设置为 0 先将其隐藏起来
      // 等到 transition2 过渡执行结束后，再显示出来
      .attr("fill-opacity", (p) => (p === d ? 0 : null))
      // 使用过渡管理器 transition2 的配置创建一个过渡
      .transition(transition2)
      // 基于新的横坐标轴比例尺，计算新添加的柱子矩形的长度
      // 其实这一步是可以省略的，因为与 down() 函数不同（它是先构建出新增的柱子，再更新横坐标轴的定义域），因为在该函数中，是先更新横坐标轴的定义域再去构建新增的柱子
      .attr("width", (d) => x(d.value) - x(0))
      // 等到 transition2 过渡执行结束后，将所有的矩形元素的透明度都设置为 100%
      // 所以前面隐藏起来的哪个柱子也会显示出来
      // 在过渡事件 end 监听器的回调函数中 this 表示当前所遍历的 DOM 元素
      // 通过 d3.select(this) 可以基于传入的 DOM 元素构建一个选择集，这样就可以使用 D3 的链式方法，例如 selection.attr() 为选择集中的元素设置属性
      .on("end", function (p) {
        d3.select(this).attr("fill-opacity", 1);
      });
  }

  // 横轴比例尺
  // 横坐标轴的数据是连续型的数值，默认使用 d3.scaleLinear 构建一个线性比例尺
  // 其中横坐标轴的值域（可视化属性，这里是页面的宽度，不包括左右的留白）范围 [left, right]
  const x = d3.scaleLinear().range([margin.left, width - margin.right]);

  // 绘制横坐标轴的函数
  // 接受一个容器 <g> 并在其中绘制出横坐标轴
  const xAxis = (g) =>
    g
      .attr("class", "x-axis") // 为容器添加一个 x-axis 类名
      // 通过设置 CSS 的 transform 属性将横坐标轴容器定位到顶部
      .attr("transform", `translate(0,${margin.top})`)
      // 横轴是一个刻度值朝上的坐标轴
      // 而且设置了刻度线的（建议）数量和刻度值的数字格式化说明符 specifier（用于格式化坐标轴的刻度值）
      // 关于数字格式化说明符 specifier 可以参考官方文档 https://github.com/d3/d3-format
      // 这里的 "s" 是指采用国际单位制词头 International System of Units (SI) prefix 来表示单位的倍数和分数
      // 先将原数值四舍五入到有效数字，然后再采用字母来表示数值，例如使用 k 表示「千」的单位
      // 这样刻度值就可以表示较大的数值
      // 具体可以参考这里 https://mathworld.wolfram.com/SIPrefixes.html
      .call(d3.axisTop(x).ticks(width / 80, "s"))
      // 删掉坐标轴的轴线（它含有 domain 类名）
      // 先通过一个三元运算符进行判断 g 是否具有 selection 方法
      // 这是为了兼容在过渡动效中更新横向坐标轴的场景
      // 在初始化时，该函数传入参数 g 是一个只包含 <g> 元素（坐标轴的容器）的选择集，可以直接调用 g.select(".domain") 方法
      // 而条形图在过渡动效中，该函数传入参数 g 是过渡对象 transition，它具有 transition.selection 方法
      // 方法 transition.selection() 获取该过渡管理器所绑定的选择集，再调用 .select(".domain") 方法对选择集进行二次选择，选择满足条件的元素（坐标轴线），构成一个新的选择集
      // 最后通过 .remove() 方法移除选择集中的元素（坐标轴线）
      .call((g) =>
        (g.selection ? g.selection() : g).select(".domain").remove()
      );
  // 其中有一个方法可以实现预想效果，就是通过将轴线的透明度设置为 0 即可
  // 因为过渡对象 transition 也有 attr 方法，可以对它所绑定的选择集里的元素设置样式
  // .call(g => g.select(".domain").attr('opacity', 0))

  // 绘制纵坐标轴的函数
  // 只需要在初始化条形图时调用一次
  // 其作用只是在 svg 的左侧绘制一条直线（并没有构建比例尺、刻度值等）
  const yAxis = (g) =>
    g
      .attr("class", "y-axis") // 为容器添加一个 y-axis 类名
      // 通过设置 CSS 的 transform 属性将纵坐标轴容器定位到左侧
      .attr("transform", `translate(${margin.left + 0.5},0)`)
      // 绘制直线，通过 <line> 元素
      .call((g) =>
        g
          .append("line")
          .attr("stroke", "currentColor")
          // 设置直线的起始点坐标（只设置纵坐标，横坐标采用默认值 x1=0）
          .attr("y1", margin.top)
          // 设置直线的终止点坐标（只设置纵坐标，横坐标采用默认值 x1=0）
          .attr("y2", height - margin.bottom)
      );

  // 分类比例尺
  // 将离散的数据映射为不同的颜色
  // 在该示例中将当前节点是否具有子节点的两个状态 [true, false]（定义域）映射为两种颜色 ["steelblue", "#aaa"]（值域）
  // 即当条形图中柱子所对应的节点具有子节点时（可下钻）则设置为蓝色，无子节点（不可下钻）则设置为灰色
  const color = d3.scaleOrdinal([true, false], ["steelblue", "#aaa"]);

  // 横坐标轴的定义域
  // 初始状态是载入根节点的数据，即从一条（根节点对应的）柱子（使用过渡动效）展开为多条（子节点）柱子
  // 所以定义域的上界采用的是根节点的数据
  x.domain([0, root.value]);

  // 在 svg 中添加一个 <rect> 矩形元素作为背景
  svg
    .append("rect")
    .attr("class", "background") // 为元素添加 background 类名
    .attr("fill", "none")
    // 因为上一步将 <rect> 矩形元素的填充元素设置为 none 所以需要设置 pointer-events
    // 通过设置 CSS 属性 pointer-events 为 all 使 svg 元素会成为鼠标事件的目标
    // 即使 fill 属性设置为 none 也不影响事件处理（属性 stroke 和 visibility 也不影响）
    .attr("pointer-events", "all") // 让矩形元素允许所有的点击事件
    .attr("width", width)
    .attr("height", height)
    .attr("cursor", "pointer") // 设置鼠标 hover 在矩形元素上时的指针样式
    // 在矩形元素上面添加点击事件监听器
    // 当用户点击条形图的背景时，会调用函数 up（返回数据的上一级）
    // 其中回调函数的第二个参数 d 是 <rect> 矩形元素所绑定的数据
    .on("click", (event, d) => up(svg, d));

  // 绘制横坐标轴
  svg.append("g").call(xAxis); // 调用相应的方法，将坐标轴在相应容器内部渲染出来

  // 绘制纵坐标轴
  svg.append("g").call(yAxis);

  // 调用 down 函数，传入的数据是根节点，绘制初始化的条形图
  // 初始状态是载入根节点的数据，即从一条（根节点对应的）柱子（使用过渡动效）展开为多条（子节点）柱子
  down(svg, root);
});
