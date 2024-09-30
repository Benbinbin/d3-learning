// 参考自 https://observablehq.com/@d3/horizon-chart/2

// 获取容器，在其中添加 svg 元素
const container = document.getElementById("container"); // 图像的容器

// 获取将面积图划分为等宽条带的数量
const bandRange = document.getElementById("bands");
let bands = Number(bandRange.value);

const bandsValueDOM = document.getElementById("bands-value");
bandsValueDOM.innerText = bands;

console.log(bands);

// 获取尺寸大小
const width = container.clientWidth; // 宽度

// 设置一些关于尺寸的参数
const size = 25; // 每个小面积图的高度（像素），即地平线图中的每条带的高度
const padding = 1; // 每个小面积图之间的间隙

// margin 为前缀的参数
// 其作用是在 svg 的外周留白，构建一个显示的安全区，以便在四周显示坐标轴
const marginTop = 30;
const marginRight = 10;
const marginBottom = 0;
const marginLeft = 10;

/**
 *
 * 异步获取数据
 * 再在回调函数中执行绘制操作
 *
 */
// 数据来源网页 https://observablehq.com/@d3/horizon-chart/2 的文件附件
const dataURL =
  "https://gist.githubusercontent.com/Benbinbin/0cec682329f9c230ebf14f1dfa0d60e8/raw/828da4a85c3eb3c3f8a56da4f6c681c8a7ae6580/traffic.csv";

d3.csv(dataURL, d3.autoType).then((data) => {
  // 需要检查一下数据解析的结果，可能并不正确，需要在后面的步骤里再进行相应的处理
  console.log(data);

  /**
   *
   * 对数据进行转换
   *
   */
  // 将数据点基于不同的系列进行分组，以便后面绘制地平线图时进行数据绑定
  // 使用方法 d3.rollup(iterable, reduce, ...keys) 基于指定的属性进行分组，并对各分组进行「压缩降维」，返回一个 InternMap 对象
  // * 第一个参数 iterable 是可迭代对象，即数据集
  // * 第二个参数 reduce 是对分组进行压缩的函数，每个分组会依次调用该函数（入参就是包含各个分组元素的数组），返回值会作为 InternMap 对象中（各分组的）键值对中的值
  // * 余下的参数 ...keys 是一系列返回分组依据
  // 具体参考官方文档 https://d3js.org/d3-array/group#rollup
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-process#分组
  // 这里是根据每个数据点（对象）的属性 d.name（即地名）进行分组，作为 InternMap 对象中（各分组的）键值对中的键名
  // 然后再对每个分组调用 reduce 函数 (values, i) => d3.sort(values, d => d.date) 进行「压缩降维」
  // 在这里 reduce 函数的作用其实并不是「压缩降维」，只是对该分组的数据按照日期（使用 d3.sort）进行排序（默认是升序排列，即数据点基于日期从早到晚排列）
  const series = d3.rollup(data, (values, i) => d3.sort(values, d => d.date), d => d.name);

  console.log(series);

  /**
   *
   * 创建 svg
   *
   */
  // svg 元素的高，根据系列的数量 series.size * 每个系列的高度 size 计算得出地平线图的高度，再加上顶部和底部的留白
  const height = series.size * size + marginTop + marginBottom;

  // 在容器 <div id="container"> 元素内创建一个 SVG 元素
  // 返回一个选择集，只有 svg 一个元素
  const svg = d3
  .select("#container")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "font: 10px sans-serif;");

  /**
   *
   * 构建比例尺
   *
   */
  // 设置横坐标轴的比例尺
  // 横坐标轴的数据是日期（时间），使用 d3.scaleUtc 构建一个时间比例尺（连续型比例尺的一种）
  // 该时间比例尺采用协调世界时 UTC，处于不同时区的用户也会显示同样的时间
  // 具体可以参考官方文档 https://d3js.org/d3-scale/time
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-scale#时间比例尺-time-scales
  const x = d3.scaleUtc()
    // 设置定义域范围
    // 从数据集的每个数据点中提取出日期（时间），并用 d3.extent() 计算出它的范围
    .domain(d3.extent(data, d => d.date))
    // 设置值域范围（所映射的可视元素）
    // svg 元素的宽度
    .range([0, width])

  // 设置纵坐标轴的比例尺
  // 针对各个面积图，用于计算它们在未「折叠」的上边界线的纵坐标值
  // 💡 将普通的面积图转换地平线图时，要将面积图划分为多个等宽的条带，然后将这些条带堆叠起来，变量 bands 就是划分的条带数量
  const y = d3.scaleLinear()
    // 设置定义域范围 [0, ymax]
    // 其中 ymax 是各数据点（对象）的属性 d.value（车流量）的最大值
    .domain([0, d3.max(data, d => d.value)])
    // 设置值域范围
    // ⚠️ 根据 svg 的坐标系统，左上角才是坐标 (0,0)，而向右和向下是正方向（坐标值为正值）
    // 所以正数 size 是在 svg 的下方，而负数 size - bands * (size - padding)  是在 svg 的上方（这样的映射规则可以确保较大的数值是朝上的，符合直觉）
    // 每个面积图（未折叠）的高度就是 size - bands * (size - padding) - size = bands * (size - padding) 即每个面积图的划分条带数量 * 每个条带的高度
    // 这里并不是以 0 作为值域的初始值，因为之后还需要对面积图进行「折叠」（将条带堆叠起来），将高度约束为 size，所以纵坐标的初始值（下界）设置为 size
    // 然后 size - bands * (size - padding) 表示朝上 bands * (size - padding) 个像素作为值域的上界
    .range([size, size - bands * (size - padding)]);

  // 颜色比例尺
  // 为面积图的划分条带设置不同的颜色
  // 💡 将普通的面积图转换地平线图时，要将面积图划分为多个等宽的条带，然后将这些条带堆叠起来，变量 bands 就是划分的条带数量
  // 为条带设置不同的颜色（一般是越高的条带设置越深的颜色），就可以将纵向值映射为颜色的深浅，（对数据进行压缩）对面积图的纵向空间进行「折叠压缩」时，可以地把纵向信息一定程度地保留下来，虽然精度会有所损失
  // 这里采用的配色方案是 d3.schemeBlues（它属于 Sequential schemes 连续型的配色方案，从连续的蓝色色谱中采样生成的）
  // 它是一个嵌套数组，包含一些预设的配色方案（共 9 种对色谱采样的方式）
  // 具体可以参考官方文档 https://d3js.org/d3-scale-chromatic/sequential#schemeBlues
  // 则 d3.schemeBlues[k] 返回一个含有 k 个元素的数组（数组的每个元素都是一个表示颜色的字符串），表示从蓝色色谱中采样 k 种颜色
  // 这里采样的数量由划分的条带数量 bands 决定
  // ⚠️ 但是由于 k 的取值范围是 3 到 9，所以（针对 bands 为 1 和 2 等情况）要进行一些处理，当每个面积图所划分的条带数量少于 3 时，则先从蓝色色谱中至少采样得到 3 种颜色，再从数组中 slice 截取与条带数量相匹配的颜色数量
  const colors = d3.schemeBlues[Math.max(3, bands)].slice(Math.max(0, 3 - bands))

  console.log(colors);

  /**
   *
   * 绘制坐标轴
   *
   */
  // 绘制横坐标轴
  svg.append("g")
    // 通过设置 CSS 的 transform 属性将横坐标轴容器「移动」到顶部
    .attr("transform", `translate(0,${marginTop})`)
    // 横轴是一个刻度值朝上的坐标轴
    // 通过 axis.ticks(count) 设置刻度数量的参考值（避免刻度过多导致刻度值重叠而影响图表的可读性）
    // 而且将坐标轴的外侧刻度 tickSizeOuter 长度设置为 0（即取消坐标轴首尾两端的刻度）
    .call(d3.axisTop(x).ticks(width / 80).tickSizeOuter(0))
    // 删除左右两侧（位于 margin 留白区域）的刻度线
    // 💡 坐标轴的每一个刻度（包括使用 <line> 元素所绘制的一条刻度线，和使用 <text> 元素所绘制的一个刻度值）都使用在一个元素 <g> 进行包裹，它含有 tick 类名
    // 所以 g.selectAll(".tick") 返回一个选择集，包含坐标轴的所有刻度（<g> 元素）
    // 然后使用 selection.filter(filter) 对一个选择集 selection 进行二次筛选
    // 入参 filter 如果是函数，则选择集中的每个元素都会调用该函数，而且依次传入三个参数：
    // * 第一个参数 d 是当前所遍历的元素所绑定的数据 datum 💡 对于坐标轴的刻度（<g> 元素），它们绑定的数据默认为刻度值，在这里就是所刻度线所显示的时间，则再通过横坐标轴比例尺 x 映射得到该刻度所对应的横坐标值 x(d)
    // * 第二个参数 i 当前所遍历的元素在其分组中的索引次序 index
    // * 第三个参数 nodes 当前分组中的所有元素 nodes
    // 当函数返回值为 truthy 真的时候，该元素会被选中到新选择集里
    // 在这里筛选出落于左右留白 margin 区域的刻度，将它们删掉
    .call(g => g.selectAll(".tick").filter(d => x(d) < marginLeft || x(d) >= width - marginRight).remove())
    // 删掉上一步所生成的坐标轴的轴线（它含有 domain 类名）
    .call(g => g.select(".domain").remove());
  // 💡 注意以上使用的是方法 selection.call(axis) 的方式来调用坐标轴对象（方法）
  // 会将选择集（只包含一个元素 <g>）传递给坐标轴对象的方法，作为第一个参数
  // 以便将坐标轴在相应容器内部渲染出来
  // 具体参考官方文档 https://d3js.org/d3-selection/control-flow#selection_call
  // 或这一篇文档 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#其他方法

  /**
   *
   * 绘制地平线图
   *
   */
  // 使用 d3.area() 创建一个面积生成器，它适用于生成各个系列的（未折叠）面积图
  // 面积生成器会基于给定的数据生成面积形状
  // 调用面积生成器时返回的结果，会基于生成器是否设置了画布上下文 context 而不同。如果设置了画布上下文 context，则生成一系列在画布上绘制路径的方法，通过调用它们可以将路径绘制到画布上；如果没有设置画布上下文 context，则生成字符串，可以作为 `<path>` 元素的属性 `d` 的值
  // 具体可以参考官方文档 https://d3js.org/d3-shape/area
  // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
  const area = d3.area()
    // 💡 调用面积生成器方法 area.defined() 设置数据完整性检验函数
    // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，返回布尔值，以判断该元素的数据是否完整
    // 该函数传入三个入参，当前的元素 `d`，该元素在数组中的索引 `i`，整个数组 `data`
    // 当函数返回 true 时，面积生成器就会执行下一步（调用坐标读取函数），最后生成该元素相应的坐标数据
    // 当函数返回 false 时，该元素就会就会跳过，当前面积就会截止，并在下一个有定义的元素再开始绘制，反映在图上就是一个个分离的面积区块
    // 具体可以参考官方文档 https://d3js.org/d3-shape/area#area_defined
    // 或这一篇笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-shape#面积生成器-areas
    // 这里通过判断当前所遍历的值是否为 NaN 来判定该数据是否缺失
    .defined(d => !isNaN(d.value))
    // 设置下边界线横坐标读取函数
    // 该函数会在调用面积生成器时，为数组中的每一个元素都执行一次，以返回该数据所对应的横坐标
    // 这里基于当前所遍历的数据点的属性 d.date，并采用比例尺 x 进行映射，计算出相应的横坐标值
    .x((d) => x(d.date))
    // 设置下边界线的纵坐标的读取函数
    // 所有系列的面积图的下边界线的初始定位都是 svg 的顶部往下一个带宽的高度（这样面积图「折叠」后都位于 svg 的顶部，便于之后将各系列面积图的重定位），所以纵坐标值都是 size
    .y0(size)
    // 设置（未折叠的面积图）上边界线的纵坐标的读取函数，基于当前所遍历的数据点的属性 d.value（车流量）并采用比例尺 y 进行映射，计算出相应的纵坐标值
    .y1((d) => y(d.value));

  // 创建一个 identifier 唯一标识符（字符串）
  // 它会作为一些 svg 元素（例如 <path> 和 <clipPath> 元素）的 id 属性值的一部分（方便其他元素基于 id 来使用），以避免与其他元素发生冲突
  // 这个字符串以 `o-` 为前缀
  // 字符串的后半部分使用 JS 原生方法 Math.random() 生成一个在 (0,1) 之间的随机数，并使用方法 number.toString() 将该数字转换为字符串，最后使用 string.slice(2) 从字符串的第三位开始截取至末尾，即舍去了小数点及其前面的数字（零），所以 uid 的后半部分由数字 0 到 9 和字母 A 到 F 共 16 种符号随机组成而成的字符串
  const uid = `O-${Math.random().toString(16).slice(2)}`;
  console.log(uid)

  // 创建容器
  // 首先建一个整体的容器
  const g = svg.append("g")
    // 返回一个选择集，其中虚拟/占位元素是一系列的 <g> 元素，它们分别作为各个系列的容器
    .selectAll("g")
    .data(series) // 绑定数据，每个容器 <g> 元素对应一个系列的数据
    .join("g") // 将这些 <g> 元素绘制到页面上
      // 通过设置 CSS 的 transform 属性将各系列的容器定位不同的位置
      // 各系列容器的纵坐标值是（它在数组 series 中的）索引值 i 乘上条带的高度 size，还要加上 marginTop（考虑 svg 顶部的留白）
      .attr("transform", (d, i) => `translate(0,${i * size + marginTop})`);
  // 💡 最后变量 g 是一个选择集，包含一系列的 `<g>` 元素，分别作为各个系列的面积图的容器

  console.log(g);

  // 在每个系列的容器 <g> 元素里分别添加 <defs> 元素
  // 💡 在 <defs> 元素定义一些图形元素，以便之后使用（而不在当前渲染出来），一般通过元素 <use> 复用这些元素
  const defs = g.append("defs");
  // 💡 最后变量 defs 是一个选择集，包含一系列的 `<defs>` 元素（它们分别在各个系列的面积图的容器 <g> 里面）

  // 在这些 <defs> 元素里分别定义一个 <clipPath> 元素和 <path> 元素

  // ✂️ 其中元素 <clipPath>（一般具有属性 id 以便被其他元素引用）路径剪裁遮罩，其作用充当一层剪贴蒙版，具体形状由其包含的元素决定
  // 这里在 <clipPath> 内部添加了一个 <rect> 设置剪裁路径的形状，让面积图约束在高度为 size 的矩形条带中
  defs.append("clipPath")
      // 为 <clipPath> 设置属性 id，其属性值使用前面生成的 uid 唯一标识符（字符串），并（使用连字符 `"-"`）拼接上字符串 `"clip"` 和索引值 i
      .attr("id", (_, i) => `${uid}-clip-${i}`)
    // 在其中添加 <rect> 子元素，以设置剪切路径的形状（将各个面积图约束在该矩形内）
    .append("rect")
      // 设置矩形的定位和尺寸，考虑各系列之间的间隔 padding
      .attr("y", padding) // 设置纵坐标值（距离其容器顶部 padding 个像素大小，作为间隔相邻条带的空隙）
      .attr("width", width) // 设置宽度（采用 svg 的宽度）
      .attr("height", size - padding); // 设置高度（由于矩形纵坐标值为 padding，所以矩形的高度为 size - padding，这样每个条带的高度都可以保持为 size）

  // ✒️ 而其中元素 <path> 路径用于绘制面积图
  // 💡 将面积图定义在 <defs> 里便于复用，由于在地平线图里，每个条带都是由多个面积图堆叠而成的
  defs.append("path")
    // 为 <path> 设置属性 id，其属性值使用前面生成的 uid 唯一标识符（字符串），并（使用连字符 `"-"`）拼接上字符串 `"path"` 和索引值 i
    .attr("id", (_, i) => `${uid}-path-${i}`)
    // 由于面积生成器并没有调用方法 area.context(canvasContext) 设置画布上下文
    // 所以调用面积生成器 area(values) 返回的结果是字符串
    // 该值作为 `<path>` 元素的属性 `d` 的值
    // 💡 在前面为每个系列容器绑定的数据是 series，它是一个 InternMap 对象
    // 在绑定数据时 InternMap 对象会转换为数组（嵌套数组），其中每个元素都是以二元数组 [键名，值] 的形式表示
    // 二元数组中，第一个元素对应于该系列名称，第二个元素是属于该系列的数据点（也是一个数组）
    // 这里通过解构二元数组，获取第二个元素（即属于该系列的数据点），赋值给变量 values 以绘制该系列的面积图
    .attr("d", ([, values]) => area(values));

  function drawHorizonChart() {
    // Create a group for each location, in which the reference area will be replicated
    // (with the SVG:use element) for each band, and translated.
    // 在每个系列的容器里分别添加一个 <g> 元素
    g.append("g")
      // 通过设置属性 clip-path 以采用在前面（<defs> 元素里）预设的 <clipPath> 元素，对该 <g> 元素里的图形元素进行裁剪，约束在高度为 size 的条带里
      // 💡 这里属性 clip-path 的值也可以直接使用（<clipPath> 元素的 id 值）`#${uid}-clip-${i}`
      .attr("clip-path", (_, i) => `url(${new URL(`#${uid}-clip-${i}`, location)})`)
      // 进行二次选择，在 <g> 元素内添加多个 <use> 元素，以便通过重复引用在前面（<defs> 元素里）预设的 <path> 元素
      .selectAll("use")
      // ⚠️ 使用 select.selectAll() 所创建的新选择集会有多个分组
      // 返回的选择集是由多个分组（各个系列容器里的 <g> 元素中）的虚拟/占位 <use> 元素构成的
      // 由于新的选择集会创建多个分组，那么原来所绑定数据与（选择集中的）元素的对照关系会发生改变
      // 从原来的一对一关系，变成了一对多关系，所以新的选择集中的元素**不会**自动「传递/继承」父节点所绑定的数据
      // 所以如果要将原来选择集中所绑定的数据继续「传递」下去，就需要手动调用 selection.data() 方法，以显式声明要继续传递数据
      // 在这种场景下，该方法的入参应该是一个返回数组的**函数**
      // 每一个分组都会调用该方法，并依次传入三个参数：
      // * 当前所遍历的分组的父节点所绑定的数据 datum
      // * 当前所遍历的分组的索引 index
      // * 选择集的所有父节点 parent nodes
      // 详细介绍可以查看笔记 https://datavis-note.benbinbin.com/article/d3/core-concept/d3-concept-data-binding#绑定数据
      // 这里所需要使用的是第二个参数 i（索引值，用于构建引用的 URL）
      // 使用 JS 原生方法 new Array(bands) 手动构建出绑定的数据，该数组所含的元素数量是 bands，而且它们的值都是 i
      .data((_ ,i) => new Array(bands).fill(i))
      // 将 <use> 元素添加到页面上
      .join("use")
        // 最终在页面上（每个系列的容器中）添加了 bands 个 <use> 元素
        // 为这些 <use> 元素设置属性 href，这里参数 i（并不是当前所遍历的 <use> 元素的索引值）是前面绑定的数据（即手动构建出来的数组），所以它表示该系列的索引值，即在同一个系列容器里这些 <use> 元素都是指向同一个 <path> 元素，绘制出相同的面积图
        // 所以每个系列都会在页面以采用在前面（<defs> 元素里）预设的 <path> 元素，在页面上渲染出 bands 个（相同的）面积图
        .attr("href", (i) => `${new URL(`#${uid}-path-${i}`, location)}`)
        // 设置面积图的填充颜色，基于当前所遍历的元素的索引值，并采用颜色比例尺 colors 进行映射，得到该面积图所对应的颜色值 colors[i]
        .attr("fill", (_, i) => colors[i])
        // 再使用 CSS 的 transform 属性，基于索引值将这些面积图进行不同的纵向偏移 translate(0,${i * size}) 是条带高度 size 的倍数
        // 💡 根据 svg 的坐标系统，左上角才是坐标 (0,0)，而向右和向下是正方向（坐标值为正值），所以索引值越大，对应的面积图朝下的偏移量就越大
        // 由于在前面为各个系列的容器设置了属性 clip-path，所以裁剪后视口高度只有 size 大小，则各个面积图只展示（不同的）一部分
        .attr("transform", (_, i) => `translate(0,${i * size})`);
        // 最终的效果相当于将面积图划分为 bands 个条带并堆叠在一起

    // 为每个系列添加文本标注（充当纵坐标轴的刻度）
    g.append("text") // 在每个系列的容器里添加 <text> 元素
        // 设置元素的定位（相对于所在的容器）
        .attr("x", 4)
        .attr("y", (size + padding) / 2) // <text> 元素在垂直方向上位于容器的中间
        .attr("dy", "0.35em") // 设置文本在垂直方向上的偏移（让文本居中对齐）
        .text(([name]) => name); // 设置文本内容为系列的名称（即地名）
  }

  drawHorizonChart();

  bandRange.addEventListener("input", event => {
    bands = Number(event.target.value)
    bandsValueDOM.innerText = bands;

    // 删除原有的地平线图，以及相应的文本标注
    g.selectAll('g').remove();
    g.selectAll('text').remove();

    // 根据变量 bands 的新值重绘地平线图
    drawHorizonChart();
  })
});
